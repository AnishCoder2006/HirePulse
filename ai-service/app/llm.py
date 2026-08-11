import logging

from langchain_groq import ChatGroq
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

_chat_model = None
_embedding_model = None


def get_chat_model():
    global _chat_model
    if _chat_model is None:
        _chat_model = ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            timeout=settings.llm_timeout_seconds,
        )
    return _chat_model


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from langchain_huggingface import HuggingFaceEmbeddings
        _embedding_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
    return _embedding_model


def structured_chain(schema):
    """A chat model bound to a Pydantic schema for structured output, with
    retry on transient failures (rate limits, timeouts, dropped connections).
    Does not retry on schema validation errors from bad model output more
    than the underlying library already handles - those indicate a prompt
    problem, not a transient one, and retrying blindly would hide that."""
    return get_chat_model().with_structured_output(schema)


llm_retry = retry(
    reraise=True,
    stop=stop_after_attempt(settings.llm_max_retries),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(Exception),
    before_sleep=lambda state: logger.warning(
        "Retrying LLM call (attempt %s) after: %s", state.attempt_number, state.outcome.exception()
    ),
)


def embed_text(text: str) -> list[float]:
    return get_embedding_model().embed_query(text)
