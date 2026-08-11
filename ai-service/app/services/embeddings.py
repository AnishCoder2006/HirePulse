import logging

from app.llm import embed_text, llm_retry

logger = logging.getLogger(__name__)


@llm_retry
def get_embedding(text: str) -> list[float]:
    logger.info("Embedding text (%d chars)", len(text))
    return embed_text(text)
