import json
import logging

import app.llm as llm
from app.schemas import CoverLetterOutput, ResumeTailorOutput

logger = logging.getLogger(__name__)

_RESUME_PROMPT = """Tailor this resume to the job below. Keep it truthful and close to the original length.
Emphasize matching skills, use strong action verbs, and work in the ATS keywords where genuinely relevant.
Do not invent experience the candidate does not have.

Job analysis:
{job_analysis}

Original resume:
{resume_text}
"""

_COVER_LETTER_PROMPT = """Write a concise, confident cover letter (300-400 words) for this job, based on the
resume and job analysis below. Open with the role and why the candidate is a fit, cover 2-3 matching
qualifications with specific examples, and close with a call to action.

Job analysis:
{job_analysis}

Resume:
{resume_text}
"""


@llm.llm_retry
def tailor_resume(resume_text: str, job_analysis: dict) -> dict:
    logger.info("Tailoring resume (%d chars)", len(resume_text))
    result = llm.structured_chain(ResumeTailorOutput).invoke(_RESUME_PROMPT.format(job_analysis=json.dumps(job_analysis), resume_text=resume_text))
    return result.model_dump()


@llm.llm_retry
def generate_cover_letter(resume_text: str, job_analysis: dict) -> dict:
    logger.info("Generating cover letter (%d chars resume)", len(resume_text))
    result = llm.structured_chain(CoverLetterOutput).invoke(
        _COVER_LETTER_PROMPT.format(job_analysis=json.dumps(job_analysis), resume_text=resume_text)
    )
    return result.model_dump()
