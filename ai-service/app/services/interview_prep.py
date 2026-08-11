import json
import logging

import app.llm as llm
from app.schemas import InterviewPrepOutput, NextQuestionOutput, InterviewReportOutput

logger = logging.getLogger(__name__)

_PROMPT = """Based on this job analysis and resume, prepare the candidate for their interview.

Job analysis:
{job_analysis}

Resume:
{resume_text}

Provide:
- likely_questions: 6-8 questions this candidate will plausibly be asked, mixing role-specific
  technical questions (grounded in the job's must-have requirements) and questions that probe
  gaps between the resume and the job's requirements
- gap_areas: specific things in the job requirements the resume doesn't clearly cover, that the
  candidate should be ready to address
- preparation_tips: 2-3 sentences of concrete prep advice for this specific role
"""


@llm.llm_retry
def generate_interview_prep(resume_text: str, job_analysis: dict) -> dict:
    logger.info("Generating interview prep")
    result = llm.structured_chain(InterviewPrepOutput).invoke(_PROMPT.format(job_analysis=json.dumps(job_analysis), resume_text=resume_text))
    return result.model_dump()


from app.schemas import EvaluateAnswerOutput, ProbeQuestionOutput
_EVAL_PROMPT = """Evaluate this interview answer based on the job requirements.

Job analysis:
{job_analysis}

Question:
{question}

Answer:
{answer}

Provide:
- score: 0 to 100 based on how well they answered and satisfied the job requirements
- feedback: constructive feedback on their answer
- gapsAddressed: any gap areas from the job analysis that they successfully addressed in this answer
"""


@llm.llm_retry
def evaluate_answer(question: str, answer: str, job_analysis: dict) -> dict:
    logger.info("Evaluating interview answer")
    result = llm.structured_chain(EvaluateAnswerOutput).invoke(_EVAL_PROMPT.format(
        job_analysis=json.dumps(job_analysis),
        question=question,
        answer=answer
    ))
    return result.model_dump()


_PROBE_PROMPT = """The candidate is being interviewed for a job. They gave a weak answer (score: {score}/100)
to the question below. Generate a follow-up probing question to help them dig deeper or clarify.

Job analysis:
{job_analysis}

Original question:
{question}

Candidate's answer:
{answer}

Provide:
- probeQuestion: A single follow-up question that pushes the candidate to go deeper
- explanation: What gap or weakness this probing question is targeting
"""


@llm.llm_retry
def generate_probe_question(question: str, answer: str, score: int, job_analysis: dict) -> dict:
    logger.info("Generating probe question (score=%s)", score)
    result = llm.structured_chain(ProbeQuestionOutput).invoke(_PROBE_PROMPT.format(
        job_analysis=json.dumps(job_analysis),
        question=question,
        answer=answer,
        score=score
    ))
    return result.model_dump()


_NEXT_PROMPT = """You are a technical interviewer conducting a live mock interview. Generate the NEXT
question to ask the candidate, based on everything that has happened so far.

Job analysis:
{job_analysis}

Candidate's resume:
{resume_text}

Conversation so far (question -> answer -> score):
{history}

Topics already covered:
{topics_covered}

Requirements:
- Ask a question that probes a topic NOT yet covered, prioritizing gaps between the resume and the
  job's must-have requirements.
- Ground the question in the candidate's actual resume content (their stated skills, projects, or
  experience) so it feels personalized, not generic.
- Do not repeat a question or topic already covered.
- Vary question type: technical depth, behavioral (STAR), system design, or problem-solving.

Provide:
- question: The next interview question to ask
- topic: The topic/skill this question targets
- rationale: One sentence on why this question is being asked now
"""


@llm.llm_retry
def generate_next_question(job_analysis: dict, resume_text: str, history: list, topics_covered: list) -> dict:
    logger.info("Generating next interview question")
    result = llm.structured_chain(NextQuestionOutput).invoke(_NEXT_PROMPT.format(
        job_analysis=json.dumps(job_analysis),
        resume_text=resume_text,
        history=json.dumps(history, ensure_ascii=False),
        topics_covered=", ".join(topics_covered) if topics_covered else "none yet"
    ))
    return result.model_dump()


_REPORT_PROMPT = """The mock interview is over. Produce a detailed report card for the candidate.

Job analysis:
{job_analysis}

Candidate's resume:
{resume_text}

Full interview transcript (question -> answer -> score -> feedback):
{history}

Provide:
- overall_score: 0 to 100 weighted across all answers
- summary: 2-3 sentences summarizing overall performance
- strengths: what the candidate did well (specific, grounded in their answers)
- weaknesses: what the candidate did poorly or failed to address
- topics_covered: topics the candidate answered competently
- topics_missed: important topics from the job requirements the candidate never covered or answered weakly
- per_question_breakdown: one entry per question with keys {{question, score, feedback}}
- recommendations: 3-5 concrete, actionable next steps to improve
"""


@llm.llm_retry
def generate_interview_report(job_analysis: dict, resume_text: str, history: list) -> dict:
    logger.info("Generating interview report card")
    result = llm.structured_chain(InterviewReportOutput).invoke(_REPORT_PROMPT.format(
        job_analysis=json.dumps(job_analysis),
        resume_text=resume_text,
        history=json.dumps(history, ensure_ascii=False)
    ))
    return result.model_dump()
