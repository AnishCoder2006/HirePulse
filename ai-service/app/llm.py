import logging
import time
from typing import Any

from langchain_groq import ChatGroq
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

_embedding_model = None


def is_rate_limit_or_unavailable(exc: Exception) -> bool:
    err_msg = str(exc).lower()
    return any(k in err_msg for k in (
        "429", "rate limit", "rate_limit", "tpm", "rpm", "quota",
        "resource_exhausted", "too many requests",
    ))


def is_model_error(exc: Exception) -> bool:
    """True for 404 model-not-found / decommissioned errors — NOT worth retrying same model."""
    err_msg = str(exc).lower()
    return any(k in err_msg for k in (
        "404", "model_not_found", "does not exist", "decommissioned", "not found for api"
    ))


def _create_gemini_model(model_name: str):
    if not settings.gemini_api_key:
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.gemini_api_key,
            timeout=settings.llm_timeout_seconds,
            max_retries=1,
        )
    except Exception as e:
        logger.warning("Failed to initialize Gemini (%s): %s", model_name, e)
        return None


def _create_groq_model(model_name: str):
    if not settings.groq_api_key:
        return None
    try:
        return ChatGroq(
            model=model_name,
            api_key=settings.groq_api_key,
            timeout=settings.llm_timeout_seconds,
            max_retries=1,
        )
    except Exception as e:
        logger.warning("Failed to initialize ChatGroq (%s): %s", model_name, e)
        return None


def _invoke_with_schema(model, schema, input_data):
    """Bind schema to model and invoke."""
    chain = model.with_structured_output(schema)
    return chain.invoke(input_data)


class StructuredChainWrapper:
    """
    Tries providers in order until one succeeds:
      1. Gemini 2.5 Flash  (primary — most capable)
      2. Gemini 2.5 Flash Lite  (Gemini fallback on 429)
      3. Groq qwen/qwen3.8-27b  (cross-provider fallback)
      4. Groq qwen/qwen3.8-27b retry after 5s  (last resort)

    404 model errors skip that provider entirely.
    429 rate-limit errors move to the next provider immediately.
    """

    def __init__(self, schema: Any):
        self.schema = schema

    def invoke(self, input_data: Any) -> Any:
        # Build ordered list of (label, model_factory) to try
        candidates = []

        if settings.gemini_api_key:
            candidates.append(("Gemini 2.5 Flash",      lambda: _create_gemini_model(settings.gemini_model)))
            candidates.append(("Gemini 2.5 Flash Lite",  lambda: _create_gemini_model(settings.gemini_fallback_model)))

        if settings.groq_api_key:
            candidates.append(("Groq qwen3.8-27b",       lambda: _create_groq_model(settings.groq_model)))
            candidates.append(("Groq qwen3.8-27b retry",  lambda: _create_groq_model(settings.groq_fallback_model)))

        last_exc = None
        for i, (label, factory) in enumerate(candidates):
            model = factory()
            if model is None:
                logger.warning("Skipping %s — model could not be initialised (missing key?)", label)
                continue
            try:
                logger.info("Trying LLM provider: %s", label)
                result = _invoke_with_schema(model, self.schema, input_data)
                logger.info("LLM provider succeeded: %s", label)
                return result
            except Exception as exc:
                last_exc = exc
                if is_model_error(exc):
                    logger.warning("%s returned model error (404/decommissioned), skipping: %s", label, exc)
                    continue
                if is_rate_limit_or_unavailable(exc):
                    wait = 2 if i < 2 else 5
                    logger.warning("%s hit rate limit (429), waiting %ss then trying next provider: %s", label, wait, exc)
                    time.sleep(wait)
                    continue
                # Unexpected error — log and try next provider anyway
                logger.error("Unexpected error from %s: %s", label, exc)
                continue

        # All providers exhausted
        raise RuntimeError(
            "All AI providers failed. Last error: " + str(last_exc)
        ) from last_exc


def structured_chain(schema):
    """Return a StructuredChainWrapper with automatic multi-provider fallback."""
    return StructuredChainWrapper(schema)


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from langchain_huggingface import HuggingFaceEmbeddings
        _embedding_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
    return _embedding_model


llm_retry = retry(
    reraise=True,
    stop=stop_after_attempt(settings.llm_max_retries),
    wait=wait_exponential(multiplier=1.5, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    before_sleep=lambda state: logger.warning(
        "Retrying LLM call (attempt %s) after: %s", state.attempt_number, state.outcome.exception()
    ),
)


def embed_text(text: str) -> list[float]:
    return get_embedding_model().embed_query(text)
