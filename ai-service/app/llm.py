import logging
import time
from typing import Any

from langchain_groq import ChatGroq
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

_chat_model = None
_fallback_chat_model = None
_gemini_chat_model = None
_embedding_model = None


def is_retryable_exception(exc: Exception) -> bool:
    err_msg = str(exc).lower()
    return any(k in err_msg for k in (
        "429", "404", "rate limit", "rate_limit", "tpm", "rpm", "quota",
        "resource_exhausted", "too many requests", "model_not_found", "does not exist"
    ))


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
        logger.warning("Failed to initialize ChatGoogleGenerativeAI (%s): %s", model_name, e)
        return None


def get_chat_model(is_fallback: bool = False, provider: str = None):
    """Return primary or fallback LLM instance based on available API keys & settings."""
    if provider == "gemini" or (provider is None and settings.gemini_api_key):
        model_name = settings.gemini_fallback_model if is_fallback else settings.gemini_model
        model = _create_gemini_model(model_name)
        if model is not None:
            return model

    if provider == "groq" or (provider is None and settings.groq_api_key):
        model_name = settings.groq_fallback_model if is_fallback else settings.groq_model
        model = _create_groq_model(model_name)
        if model is not None:
            return model

    # Fallback to whatever key is available
    if settings.gemini_api_key:
        return _create_gemini_model(settings.gemini_model)
    return _create_groq_model(settings.groq_model)


class StructuredChainWrapper:
    """Wrapper that binds a schema to primary model and falls back to lighter model or Gemini on 404 or 429 rate limit."""

    def __init__(self, schema: Any):
        self.schema = schema

    def invoke(self, input_data: Any) -> Any:
        primary_model = get_chat_model(is_fallback=False)
        try:
            chain = primary_model.with_structured_output(self.schema)
            return chain.invoke(input_data)
        except Exception as exc:
            if is_retryable_exception(exc):
                logger.warning("Primary LLM hit error: %s. Attempting fallback model...", exc)
                time.sleep(1.0)
                fallback_model = get_chat_model(is_fallback=True)
                if fallback_model is not None:
                    try:
                        fallback_chain = fallback_model.with_structured_output(self.schema)
                        return fallback_chain.invoke(input_data)
                    except Exception as fallback_exc:
                        if settings.gemini_api_key:
                            try:
                                gemini_model = get_chat_model(is_fallback=False, provider="gemini")
                                if gemini_model is not None:
                                    return gemini_model.with_structured_output(self.schema).invoke(input_data)
                            except Exception:
                                pass
                        logger.error("Fallback LLM model also failed: %s", fallback_exc)
                        raise fallback_exc
            raise exc


def structured_chain(schema):
    """A chat model bound to a Pydantic schema for structured output, with
    automatic model fallback and retry on transient 429/404 failures."""
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


