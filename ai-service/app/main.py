import logging
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.logging_config import configure_logging
from app.schemas import (
    CoverLetterRequest,
    EmbedRequest,
    InterviewPrepRequest,
    JobDescriptionRequest,
    JobExtractRequest,
    ResumeTailorRequest,
    StarStoriesRequest,
)
from app.services.embeddings import get_embedding
from app.services.interview_prep import generate_interview_prep
from app.services.jd_analyst import analyze_job_description
from app.services.job_extractor import extract_job_from_text
from app.services.resume_writer import generate_cover_letter, tailor_resume
from app.services.star_stories import generate_star_stories

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="Job Hunt AI Service")


@app.middleware("http")
async def require_internal_token(request: Request, call_next):
    # Only Node's backend should ever call this service. It's not meant to
    # be internet-facing, but a shared token stops it being wide open to
    # anything else on the same network.
    if request.url.path != "/health":
        token = request.headers.get("x-internal-token")
        if token != settings.internal_service_token:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=502, content={"error": f"AI service error: {str(exc)}"})


@app.get("/health")
def health():
    return {"status": "ok", "model": settings.groq_model}


@app.post("/analyze-jd")
def analyze_jd(payload: JobDescriptionRequest):
    return analyze_job_description(payload.job_title, payload.company, payload.description)


@app.post("/tailor-resume")
def tailor(payload: ResumeTailorRequest):
    return tailor_resume(payload.resume_text, payload.job_analysis)


@app.post("/cover-letter")
def cover_letter(payload: CoverLetterRequest):
    return generate_cover_letter(payload.resume_text, payload.job_analysis)


@app.post("/interview-prep")
def interview_prep(payload: InterviewPrepRequest):
    return generate_interview_prep(payload.resume_text, payload.job_analysis)


from app.schemas import EvaluateAnswerRequest, InterviewReportRequest, InterviewStepRequest, ProbeQuestionRequest
from app.services.interview_graph import run_interview_step
from app.services.interview_prep import evaluate_answer, generate_interview_report, generate_probe_question

@app.post("/evaluate-answer")
def eval_answer(payload: EvaluateAnswerRequest):
    return evaluate_answer(payload.question, payload.answer, payload.job_analysis)


@app.post("/probe-question")
def probe_question(payload: ProbeQuestionRequest):
    return generate_probe_question(payload.question, payload.answer, payload.score, payload.job_analysis)


@app.post("/interview/step")
def interview_step(payload: InterviewStepRequest):
    """Run one step of the LangGraph interview. The backend persists the
    returned state (history, question_count) between calls."""
    return run_interview_step(
        job_analysis=payload.job_analysis,
        resume_text=payload.resume_text,
        history=payload.history,
        current_question=payload.current_question,
        current_answer=payload.current_answer,
        question_count=payload.question_count,
        max_questions=payload.max_questions,
    )


@app.post("/interview/report")
def interview_report(payload: InterviewReportRequest):
    """Generate a report card from an interview history — used when the
    session ends early or at any point so the score card always appears."""
    return generate_interview_report(
        job_analysis=payload.job_analysis,
        resume_text=payload.resume_text,
        history=payload.history,
    )


@app.post("/embed")
def embed(payload: EmbedRequest):
    return {"embedding": get_embedding(payload.text)}


@app.post("/extract-job")
def extract_job(payload: JobExtractRequest):
    return extract_job_from_text(payload.page_text, payload.source_url)


@app.post("/star-stories")
def star_stories(payload: StarStoriesRequest):
    return generate_star_stories(payload.resume_text, payload.job_analysis)
