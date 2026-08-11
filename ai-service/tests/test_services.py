"""Tests for the AI service LLM-calling chains."""

from unittest.mock import MagicMock, patch

try:
    from conftest import (
        mock_job_analysis_output,
        mock_resume_tailor_output,
        mock_cover_letter_output,
        mock_interview_prep_output,
        mock_evaluate_answer_output,
        mock_probe_question_output,
        mock_next_question_output,
        mock_interview_report_output,
    )
except ImportError:
    from tests.conftest import (
        mock_job_analysis_output,
        mock_resume_tailor_output,
        mock_cover_letter_output,
        mock_interview_prep_output,
        mock_evaluate_answer_output,
        mock_probe_question_output,
        mock_next_question_output,
        mock_interview_report_output,
    )


def _make_pydantic_like(data):
    obj = MagicMock()
    obj.model_dump.return_value = data
    return obj


class TestAnalyzeJobDescription:
    def test_returns_structured_output(self, mock_chain):
        from app.services.jd_analyst import analyze_job_description
        expected = mock_job_analysis_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = analyze_job_description("React Developer", "Acme", "We need a React dev...")
        assert result == expected
        assert "must_have_requirements" in result
        mock_chain.invoke.assert_called_once()

    def test_passes_job_title_to_prompt(self, mock_chain):
        from app.services.jd_analyst import analyze_job_description
        mock_chain.invoke.return_value = _make_pydantic_like(mock_job_analysis_output())
        analyze_job_description("Senior Engineer", "Google", "Build scalable systems")
        prompt_arg = mock_chain.invoke.call_args[0][0]
        assert "Senior Engineer" in prompt_arg


class TestTailorResume:
    def test_returns_tailored_resume(self, mock_chain):
        from app.services.resume_writer import tailor_resume
        expected = mock_resume_tailor_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = tailor_resume("Original resume text", {"must_have_requirements": ["React"]})
        assert result == expected
        assert "resume_text" in result


class TestGenerateCoverLetter:
    def test_returns_cover_letter(self, mock_chain):
        from app.services.resume_writer import generate_cover_letter
        expected = mock_cover_letter_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = generate_cover_letter("Resume text", {"positioning_strategy": "Highlight X"})
        assert result == expected
        assert "cover_letter_text" in result


class TestGenerateInterviewPrep:
    def test_returns_prep_with_questions(self, mock_chain):
        from app.services.interview_prep import generate_interview_prep
        expected = mock_interview_prep_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = generate_interview_prep("Resume text", {"must_have_requirements": ["React"]})
        assert result == expected
        assert len(result["likely_questions"]) >= 2


class TestEvaluateAnswer:
    def test_returns_score_and_feedback(self, mock_chain):
        from app.services.interview_prep import evaluate_answer
        expected = mock_evaluate_answer_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = evaluate_answer("What is React?", "React is a UI library...", {"must_have_requirements": ["React"]})
        assert result == expected
        assert 0 <= result["score"] <= 100


class TestGenerateProbeQuestion:
    def test_returns_probe_for_weak_answer(self, mock_chain):
        from app.services.interview_prep import generate_probe_question
        expected = mock_probe_question_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = generate_probe_question("What is React?", "It is a framework", 30, {"must_have_requirements": ["React"]})
        assert result == expected
        assert "probeQuestion" in result


class TestGenerateNextQuestion:
    def test_returns_next_question_with_topic(self, mock_chain):
        from app.services.interview_prep import generate_next_question
        expected = mock_next_question_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = generate_next_question({"must_have_requirements": ["React"]}, "React dev", [], [])
        assert result == expected
        assert "question" in result
        assert "topic" in result


class TestGenerateInterviewReport:
    def test_returns_full_report_card(self, mock_chain):
        from app.services.interview_prep import generate_interview_report
        expected = mock_interview_report_output()
        mock_chain.invoke.return_value = _make_pydantic_like(expected)
        result = generate_interview_report({"must_have_requirements": ["React"]}, "React dev", [])
        assert result == expected
        assert 0 <= result["overall_score"] <= 100
        assert isinstance(result["strengths"], list)
        assert isinstance(result["recommendations"], list)


class TestGetEmbedding:
    def test_returns_embedding_vector(self, mock_embed):
        from app.services.embeddings import get_embedding
        result = get_embedding("Some text to embed")
        assert isinstance(result, list)
        assert len(result) == 384


class TestInterviewGraph:
    def test_graph_builds_without_error(self):
        from app.services.interview_graph import build_interview_graph
        graph = build_interview_graph()
        assert graph is not None

    def test_route_returns_report_when_max_reached(self):
        from app.services.interview_graph import _route_node
        state = {"question_count": 8, "max_questions": 8, "current_evaluation": {"score": 90}}
        assert _route_node(state) == "report"

    def test_route_returns_probe_when_score_low(self):
        from app.services.interview_graph import _route_node
        state = {"question_count": 2, "max_questions": 8, "current_evaluation": {"score": 40}}
        assert _route_node(state) == "probe"

    def test_route_returns_question_when_score_good(self):
        from app.services.interview_graph import _route_node
        state = {"question_count": 2, "max_questions": 8, "current_evaluation": {"score": 80}}
        assert _route_node(state) == "question"

    @patch("app.services.interview_graph.evaluate_answer")
    @patch("app.services.interview_graph.generate_next_question")
    def test_run_step_evaluates_and_generates_next(self, mock_next, mock_eval):
        from app.services.interview_graph import run_interview_step
        mock_eval.return_value = mock_evaluate_answer_output()
        mock_next.return_value = mock_next_question_output()
        result = run_interview_step({"must_have_requirements": ["React"]}, "React dev", [], "Q1", "A1", 0, 8)
        assert result["evaluation"]["score"] == 75
        assert result["next_question"] is not None
        assert result["complete"] is False
        assert result["question_count"] == 1

    @patch("app.services.interview_graph.evaluate_answer")
    @patch("app.services.interview_graph.generate_interview_report")
    def test_run_step_generates_report_when_complete(self, mock_report, mock_eval):
        from app.services.interview_graph import run_interview_step
        mock_eval.return_value = mock_evaluate_answer_output()
        mock_report.return_value = mock_interview_report_output()
        result = run_interview_step({"must_have_requirements": ["React"]}, "React dev", [], "Last Q", "Final A", 7, 8)
        assert result["complete"] is True
        assert result["report"] is not None
        assert result["report"]["overall_score"] == 72
        assert result["next_question"] is None

    @patch("app.services.interview_graph.evaluate_answer")
    @patch("app.services.interview_graph.generate_probe_question")
    def test_run_step_probes_on_low_score(self, mock_probe, mock_eval):
        from app.services.interview_graph import run_interview_step
        mock_eval.return_value = {"score": 40, "feedback": "Weak", "gapsAddressed": []}
        mock_probe.return_value = mock_probe_question_output()
        result = run_interview_step({"must_have_requirements": ["React"]}, "React dev", [], "Explain useEffect", "It is a hook", 0, 8)
        assert result["evaluation"]["score"] == 40
        assert result["next_question"] == "Can you explain how useEffect cleanup works?"
        assert result["complete"] is False
