"""Shared test fixtures for the AI service tests.

The LLM-calling chains use LangChain's with_structured_output against Pydantic
schemas. We mock the underlying chat model's .invoke() so tests run without
a real Groq/Gemini API key, and verify that each service function correctly
parses the structured output into the expected schema shape.
"""

from unittest.mock import MagicMock, patch

import pytest


# --- Mock data factories ---

def mock_job_analysis_output():
    return {
        "must_have_requirements": ["3+ years React", "TypeScript"],
        "preferred_skills": ["AWS", "Docker"],
        "key_responsibilities": ["Build UI components", "Code review"],
        "keywords_for_ats": ["React", "TypeScript", "CI/CD"],
        "red_flags": ["Vague salary range"],
        "positioning_strategy": "Emphasize React + TS experience.",
    }


def mock_resume_tailor_output():
    return {
        "resume_text": "Tailored resume text here.",
        "summary_of_changes": "Added ATS keywords.",
        "keywords_added": ["React", "TypeScript"],
    }


def mock_cover_letter_output():
    return {
        "cover_letter_text": "Dear Hiring Manager...",
        "key_points_highlighted": ["React expertise", "Team leadership"],
    }


def mock_interview_prep_output():
    return {
        "likely_questions": ["Tell me about your React experience.", "How do you handle state?"],
        "gap_areas": ["No AWS experience mentioned"],
        "preparation_tips": "Review AWS basics and Docker.",
    }


def mock_evaluate_answer_output():
    return {
        "score": 75,
        "feedback": "Good answer, covered the main points.",
        "gapsAddressed": ["React hooks"],
    }


def mock_probe_question_output():
    return {
        "probeQuestion": "Can you explain how useEffect cleanup works?",
        "explanation": "Probing deeper on React hooks knowledge.",
    }


def mock_next_question_output():
    return {
        "question": "Describe a challenging bug you debugged.",
        "topic": "Problem-solving",
        "rationale": "Testing practical debugging experience.",
    }


def mock_interview_report_output():
    return {
        "overall_score": 72,
        "summary": "Solid performance with room for improvement.",
        "strengths": ["Clear communication", "Good React knowledge"],
        "weaknesses": ["Weak on AWS", "Vague system design"],
        "topics_covered": ["React", "TypeScript", "Testing"],
        "topics_missed": ["AWS", "System design"],
        "per_question_breakdown": [
            {"question": "Tell me about React.", "score": 80, "feedback": "Great answer."},
            {"question": "Explain AWS.", "score": 40, "feedback": "Needs more depth."},
        ],
        "recommendations": ["Study AWS fundamentals", "Practice system design questions"],
    }


# --- Fixtures ---

@pytest.fixture
def mock_chain():
    """Patch structured_chain so .invoke() returns a mock Pydantic-like object.

    Each test configures the return value via the `output` parameter on the
    mock's .invoke() method.
    """
    with patch("app.llm.structured_chain") as mock_sc:
        chain = MagicMock()
        mock_sc.return_value = chain
        yield chain


@pytest.fixture
def mock_embed():
    """Patch embed_text to return a fixed embedding vector."""
    with patch("app.llm.embed_text") as mock_et:
        mock_et.return_value = [0.1] * 384
        yield mock_et
