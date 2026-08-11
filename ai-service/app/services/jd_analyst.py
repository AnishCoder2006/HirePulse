import logging

import app.llm as llm
from app.schemas import JobAnalysisOutput

logger = logging.getLogger(__name__)

_PROMPT = """You are a senior job description analyst. Extract structured requirements from this posting.

Job title: {job_title}
Company: {company}

Job description:
{description}

Identify:
- must_have_requirements: non-negotiable requirements (education, years of experience, certifications, skills)
- preferred_skills: nice-to-have skills
- key_responsibilities: main duties as short bullet phrases
- keywords_for_ats: important phrases an ATS would scan for
- red_flags: anything unusual or concerning about the posting
- positioning_strategy: 2-4 sentences on how a candidate should frame their experience
"""


@llm.llm_retry
def analyze_job_description(job_title: str, company: str, description: str) -> dict:
    logger.info("Analyzing job description for '%s' at '%s'", job_title, company)
    result = llm.structured_chain(JobAnalysisOutput).invoke(_PROMPT.format(job_title=job_title, company=company, description=description))
    return result.model_dump()
