from pydantic import BaseModel, Field


# ---- Request models ----

class JobDescriptionRequest(BaseModel):
    job_title: str = Field(min_length=1)
    company: str = Field(min_length=1)
    description: str = Field(min_length=1)


class ResumeTailorRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_analysis: dict


class CoverLetterRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_analysis: dict


class InterviewPrepRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_analysis: dict


class EvaluateAnswerRequest(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    job_analysis: dict
    previous_answers: list = []  # Context from earlier answers in the session


class ProbeQuestionRequest(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    score: int = Field(ge=0, le=100)
    job_analysis: dict


class InterviewStepRequest(BaseModel):
    """One step of the LangGraph-driven interview. The graph is invoked once
    per answer (the interview is interactive), with the full conversation
    state passed in and returned so the backend can persist it between calls."""

    job_analysis: dict
    resume_text: str = Field(min_length=1)
    history: list = []  # [{question, answer, evaluation}]
    current_question: str = Field(min_length=1)
    current_answer: str = Field(min_length=1)
    question_count: int = Field(ge=0)
    max_questions: int = Field(ge=1, default=8)


class InterviewReportRequest(BaseModel):
    """Generate a report card from a finished (or early-ended) interview."""
    job_analysis: dict
    resume_text: str = Field(min_length=1)
    history: list = []


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1)


class JobExtractRequest(BaseModel):
    page_text: str = Field(min_length=50)
    source_url: str = Field(min_length=1)


class StarStoriesRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_analysis: dict


# ---- Structured LLM output models (used with with_structured_output) ----

class JobAnalysisOutput(BaseModel):
    must_have_requirements: list[str]
    preferred_skills: list[str]
    key_responsibilities: list[str]
    keywords_for_ats: list[str]
    red_flags: list[str]
    positioning_strategy: str


class ResumeTailorOutput(BaseModel):
    resume_text: str
    summary_of_changes: str
    keywords_added: list[str]


class CoverLetterOutput(BaseModel):
    cover_letter_text: str
    key_points_highlighted: list[str]


class InterviewPrepOutput(BaseModel):
    likely_questions: list[str]
    gap_areas: list[str]
    preparation_tips: str


class EvaluateAnswerOutput(BaseModel):
    score: int
    feedback: str
    gapsAddressed: list[str]


class ProbeQuestionOutput(BaseModel):
    probeQuestion: str
    explanation: str


class NextQuestionOutput(BaseModel):
    question: str
    topic: str
    rationale: str


class InterviewReportOutput(BaseModel):
    overall_score: int
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    topics_covered: list[str]
    topics_missed: list[str]
    per_question_breakdown: list[dict]
    recommendations: list[str]


class JobExtractOutput(BaseModel):
    title: str
    company: str
    location: str
    description: str


class StarStoryItem(BaseModel):
    question: str
    situation: str
    task: str
    action: str
    result: str
    resume_source: str


class StarStoriesOutput(BaseModel):
    stories: list[StarStoryItem]
