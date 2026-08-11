import logging
from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.services.interview_prep import (
    evaluate_answer,
    generate_interview_report,
    generate_next_question,
    generate_probe_question,
)

logger = logging.getLogger(__name__)

# The interview is interactive: the backend calls this graph once per answer,
# passing the full conversation state in and getting the next state back.
# Redis on the backend persists the state between calls, so the graph itself
# stays stateless and doesn't need LangGraph checkpointing.


class InterviewState(TypedDict):
    job_analysis: dict
    resume_text: str
    history: list  # [{question, answer, evaluation}]
    current_question: str
    current_answer: str
    current_evaluation: dict
    next_question: str
    topics_covered: list
    question_count: int
    max_questions: int
    report: dict
    complete: bool


def _evaluate_node(state: InterviewState) -> dict:
    """Score the latest answer with the full conversation as context."""
    evaluation = evaluate_answer(
        question=state["current_question"],
        answer=state["current_answer"],
        job_analysis=state["job_analysis"],
    )
    return {"current_evaluation": evaluation}


def _route_node(state: InterviewState) -> str:
    """Decide what happens next based on the answer quality and progress."""
    if state["question_count"] + 1 >= state["max_questions"]:
        return "report"
    if state["current_evaluation"]["score"] < 60:
        return "probe"
    return "question"


def _probe_node(state: InterviewState) -> dict:
    """Weak answer - dig deeper on the same topic before moving on."""
    probe = generate_probe_question(
        question=state["current_question"],
        answer=state["current_answer"],
        score=state["current_evaluation"]["score"],
        job_analysis=state["job_analysis"],
    )
    return {"next_question": probe["probeQuestion"]}


def _question_node(state: InterviewState) -> dict:
    """Strong answer - generate the next dynamic question grounded in the
    resume, job requirements, and what's already been covered."""
    next_q = generate_next_question(
        job_analysis=state["job_analysis"],
        resume_text=state["resume_text"],
        history=state["history"],
        topics_covered=state["topics_covered"],
    )
    return {"next_question": next_q["question"]}


def _report_node(state: InterviewState) -> dict:
    """Interview over - produce the detailed report card."""
    report = generate_interview_report(
        job_analysis=state["job_analysis"],
        resume_text=state["resume_text"],
        history=state["history"],
    )
    return {"report": report, "complete": True}


def build_interview_graph():
    graph = StateGraph(InterviewState)

    graph.add_node("evaluate", _evaluate_node)
    graph.add_node("probe", _probe_node)
    graph.add_node("question", _question_node)
    graph.add_node("report", _report_node)

    graph.set_entry_point("evaluate")
    graph.add_conditional_edges(
        "evaluate",
        _route_node,
        {
            "probe": "probe",
            "question": "question",
            "report": "report",
        },
    )
    graph.add_edge("probe", END)
    graph.add_edge("question", END)
    graph.add_edge("report", END)

    return graph.compile()


_interview_graph = None


def get_interview_graph():
    global _interview_graph
    if _interview_graph is None:
        _interview_graph = build_interview_graph()
    return _interview_graph


def run_interview_step(
    job_analysis: dict,
    resume_text: str,
    history: list,
    current_question: str,
    current_answer: str,
    question_count: int,
    max_questions: int = 8,
) -> dict:
    """Run one step of the interview graph and return the updated state.

    The backend persists the returned state between calls, so each invocation
    only processes the latest answer and produces the next question (or the
    final report).
    """
    logger.info("Running interview step %s/%s", question_count + 1, max_questions)

    # Topics covered so far = topics of questions the candidate answered well.
    topics_covered = [
        entry.get("topic", "")
        for entry in history
        if entry.get("evaluation", {}).get("score", 0) >= 60
    ]

    initial_state: InterviewState = {
        "job_analysis": job_analysis,
        "resume_text": resume_text,
        "history": history,
        "current_question": current_question,
        "current_answer": current_answer,
        "current_evaluation": {},
        "next_question": "",
        "topics_covered": topics_covered,
        "question_count": question_count,
        "max_questions": max_questions,
        "report": {},
        "complete": False,
    }

    result = get_interview_graph().invoke(initial_state)

    # Append this Q&A to the history so the next step has full context.
    updated_history = history + [
        {
            "question": current_question,
            "answer": current_answer,
            "evaluation": result["current_evaluation"],
        }
    ]

    return {
        "evaluation": result["current_evaluation"],
        "next_question": result.get("next_question") or None,
        "complete": result.get("complete", False),
        "report": result.get("report") or None,
        "history": updated_history,
        "question_count": question_count + 1,
    }