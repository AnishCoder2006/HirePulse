import json
import logging

import app.llm as llm
from app.schemas import StarStoriesOutput

logger = logging.getLogger(__name__)

_PROMPT = """Create behavioral interview STAR stories from this resume and job analysis.
Each story should answer a likely behavioral question ("Tell me about a time when…") grounded in real resume content.

Job analysis:
{job_analysis}

Resume:
{resume_text}

For each story provide:
- question: the behavioral interview question this story answers
- situation: brief context (1-2 sentences)
- task: what the candidate needed to accomplish
- action: specific steps they took (use "I" voice)
- result: measurable outcome or impact
- resume_source: which resume bullet or experience this story is based on

Generate 4-6 stories covering leadership, problem-solving, teamwork, conflict, and technical challenges where relevant to the job gaps.
"""


@llm.llm_retry
def generate_star_stories(resume_text: str, job_analysis: dict) -> dict:
    logger.info("Generating STAR stories")
    result = llm.structured_chain(StarStoriesOutput).invoke(
        _PROMPT.format(job_analysis=json.dumps(job_analysis), resume_text=resume_text)
    )
    return result.model_dump()
