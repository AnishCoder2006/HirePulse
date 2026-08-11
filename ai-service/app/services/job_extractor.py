import logging

import app.llm as llm
from app.schemas import JobExtractOutput

logger = logging.getLogger(__name__)

_PROMPT = """Extract structured job posting details from this web page text.
The text was scraped from a job listing URL (LinkedIn, Naukri, company career page, etc.).

Page text:
{page_text}

Source URL (for context): {source_url}

Return:
- title: job title
- company: company name (use "Unknown" if not found)
- location: location or "Remote" or empty string if unknown
- description: full job description, requirements, and responsibilities combined into readable plain text. Preserve bullet points as newlines. If very long, keep the most important sections.
"""


@llm.llm_retry
def extract_job_from_text(page_text: str, source_url: str) -> dict:
    logger.info("Extracting job from URL page text (%d chars)", len(page_text))
    result = llm.structured_chain(JobExtractOutput).invoke(
        _PROMPT.format(page_text=page_text[:12000], source_url=source_url)
    )
    return result.model_dump()
