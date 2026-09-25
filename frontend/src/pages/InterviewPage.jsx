import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Brain,
  MessageSquare,
  Loader2,
  Target,
} from "lucide-react";

import { BACKEND_URL } from "../lib/apiConfig";

// Centralized Backend URL Resolution
const API_URL = BACKEND_URL;

// --- Score Ring Component ---
const ScoreRing = ({ score, size = "md" }) => {
  const numericScore = typeof score === "number" ? score : parseFloat(score) || 0;
  const radius = size === "lg" ? 44 : 20;
  const stroke = size === "lg" ? 8 : 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (numericScore / 100) * circumference;

  let colorClass = "text-emerald-400";
  let bgGlow = "shadow-[0_0_15px_rgba(16,185,129,0.2)]";
  if (numericScore < 40) {
    colorClass = "text-rose-400";
    bgGlow = "shadow-[0_0_15px_rgba(244,63,94,0.2)]";
  } else if (numericScore < 70) {
    colorClass = "text-amber-400";
    bgGlow = "shadow-[0_0_15px_rgba(245,158,11,0.2)]";
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-slate-900/40 ${bgGlow}`}
    >
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90 transition-all duration-1000 ease-out"
      >
        <circle
          stroke="rgba(255, 255, 255, 0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={`${colorClass} transition-all duration-1000 ease-out`}
        />
      </svg>
      <span
        className={`absolute font-bold text-slate-100 ${
          size === "lg" ? "text-xl" : "text-xs"
        }`}
      >
        {Math.round(numericScore)}%
      </span>
    </div>
  );
};

// --- Tag List Component ---
const TagList = ({ tags, variant = "neutral" }) => {
  if (!tags || tags.length === 0) return null;

  const styleMap = {
    neutral: "bg-white/5 border-white/10 text-slate-300",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    danger: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((tag, idx) => (
        <span
          key={idx}
          className={`px-2.5 py-1 text-xs font-medium rounded-md border backdrop-blur-sm ${styleMap[variant]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

// --- Comprehensive Report Card Component ---
const ReportCard = ({ report, onRestart }) => {
  if (!report) return null;

  const finalScore =
    report.overallScore ??
    report.overall_score ??
    report.score ??
    report.totalScore ??
    0;

  const questionsList =
    report.questionBreakdown ||
    report.per_question_breakdown ||
    report.question_breakdown ||
    report.history ||
    report.questions ||
    [];

  const topicsCovered = report.topicsCovered || report.topics_missed || [];
  const topicsMissed = report.topicsMissed || report.topics_missed || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Summary Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <ScoreRing score={finalScore} size="lg" />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-2">
                <Award className="w-3.5 h-3.5" /> Interview Completed
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Executive Performance Analysis
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Evaluation generated from session feedback and STAR framework alignment.
              </p>
            </div>
          </div>
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Start New Session
          </button>
        </div>
      </div>

      {/* Per-Question Grades Grid */}
      {questionsList.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400" /> Per-Question Performance Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {questionsList.map((q, idx) => {
              const qScore =
                q.score ??
                q.evaluation?.score ??
                q.overallScore ??
                0;

              const questionText =
                q.question || q.questionText || `Question ${idx + 1}`;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-indigo-400 block mb-0.5">
                      Question {idx + 1}
                    </span>
                    <p className="text-xs text-slate-200 truncate" title={questionText}>
                      {questionText}
                    </p>
                  </div>
                  <ScoreRing score={qScore} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Strengths & Growth Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Key Strengths
          </div>
          <ul className="space-y-2.5">
            {report.strengths?.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-amber-400 font-semibold">
            <AlertCircle className="w-5 h-5" /> Strategic Areas for Growth
          </div>
          <ul className="space-y-2.5">
            {report.weaknesses?.map((wk, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                <span>{wk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Topics Coverages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-md">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Topics Demonstrated
          </h4>
          <TagList tags={topicsCovered} variant="success" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-md">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Missed Opportunities
          </h4>
          <TagList tags={topicsMissed} variant="warning" />
        </div>
      </div>
    </div>
  );
};

// --- Main Interview Page Component ---
export default function InterviewPage() {
  const [analysis, setAnalysis] = useState(null);
  const [sessions, setSessions] = useState([]);

  // Active Session State
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [report, setReport] = useState(null);

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  const getHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("jwt");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const getSessionId = (sess) => {
    if (!sess) return null;
    return sess.id || sess._id || sess.sessionId;
  };

  useEffect(() => {
    const fetchAnalysis = async () => {
      const id = localStorage.getItem("jobai-analysis-id");
      if (!id) return;
      try {
        const res = await fetch(`${API_URL}/api/analysis/${id}`, {
          headers: getHeaders(),
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAnalysis(data);
        }
      } catch (err) {
        console.error("Failed to load analysis", err);
      }
    };

    fetchAnalysis();
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/interview-sessions`, {
        headers: getHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  useEffect(() => {
    let stream = null;
    if (cameraOn && activeSession && !report) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch((err) => console.warn("Camera unavailable:", err));
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraOn, activeSession, report]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";

      recog.onresult = (e) => {
        let currentTranscript = "";
        for (let i = 0; i < e.results.length; i++) {
          currentTranscript += e.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recog.onerror = (err) => console.error("Speech Recog Error:", err);
      recog.onend = () => setIsListening(false);
      recognitionRef.current = recog;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const startInterview = async () => {
    setStarting(true);
    setErrorMsg(null);
    try {
      const analysisId = localStorage.getItem("jobai-analysis-id") || analysis?.id;

      const res = await fetch(`${API_URL}/api/interview-sessions`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ analysisId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Server error (${res.status})`);
      }

      const session = await res.json();
      setActiveSession(session);
      setCurrentQuestion(session.question || session.firstQuestion || "Tell me about yourself.");
      setQuestionCount(1);
      setReport(null);
      setTranscript("");

      try {
        speakText(session.question || session.firstQuestion || "Tell me about yourself.");
      } catch (e) {
        console.warn("Speech error", e);
      }
    } catch (err) {
      console.error("Error starting interview", err);
      setErrorMsg(err.message);
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    const sessionId = getSessionId(activeSession);
    if (!transcript.trim() || submitting || !sessionId) return;
    setSubmitting(true);
    if (isListening) toggleListening();

    try {
      const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}/answer`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ answer: transcript }),
      });

      if (res.ok) {
        const data = await res.json();
        setTranscript("");
        if (data.complete || data.isFinished) {
          setActiveSession(null);
          setReport(data.report);
          fetchSessions();
        } else {
          setCurrentQuestion(data.nextQuestion);
          setQuestionCount((prev) => prev + 1);
          speakText(data.nextQuestion);
        }
      }
    } catch (err) {
      console.error("Failed submitting answer", err);
      setErrorMsg("Failed to submit answer. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const finishInterviewEarly = async () => {
    const sessionId = getSessionId(activeSession);
    if (!sessionId) {
      setActiveSession(null);
      return;
    }

    setEnding(true);
    try {
      const res = await fetch(`${API_URL}/api/interview-sessions/${sessionId}/finish`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        setActiveSession(null);
        fetchSessions();
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Error finishing session", err);
      setActiveSession(null);
    } finally {
      setEnding(false);
    }
  };

  const deleteSession = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/interview-sessions/${id}/delete`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error("Error deleting session", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pt-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">
              <Brain className="w-4 h-4" /> AI Practice Arena
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Mock Technical Interview
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Simulate live technical & behavioral interviews with real-time feedback.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-sm flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {report ? (
          <ReportCard
            report={report}
            onRestart={() => {
              setReport(null);
              setActiveSession(null);
            }}
          />
        ) : activeSession ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Question #{questionCount}
                  </span>
                  <button
                    onClick={finishInterviewEarly}
                    disabled={ending}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors disabled:opacity-50"
                  >
                    {ending ? "Ending..." : "End Interview"}
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-white leading-relaxed">
                  {currentQuestion}
                </h3>
              </div>

              <div className="relative aspect-video rounded-2xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-2xl flex items-center justify-center">
                {cameraOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <VideoOff className="w-10 h-10" />
                    <span className="text-xs">Camera is Off</span>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs text-slate-300 min-h-[44px]">
                  <div className="font-semibold text-indigo-400 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Your Speech Transcript:
                  </div>
                  {transcript || (
                    <span className="text-slate-500 italic">
                      Click recording and start speaking...
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleListening}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isListening
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4 text-rose-400" /> Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" /> Start Speaking
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setCameraOn(!cameraOn)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                  >
                    {cameraOn ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <VideoOff className="w-4 h-4 text-rose-400" />
                    )}
                  </button>
                </div>

                <button
                  onClick={submitAnswer}
                  disabled={!transcript.trim() || submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                >
                  {submitting ? "Evaluating..." : "Submit Answer"}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-md space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Profile
                </h4>
                <div>
                  <p className="text-sm font-bold text-white">
                    {analysis?.jobTitle || "Software Engineer"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {analysis?.companyName || "Target Enterprise"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur-xl text-center space-y-4 max-w-2xl mx-auto shadow-2xl">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Ready for your AI Mock Session?
              </h2>
              <p className="text-sm text-slate-400">
                The interview engine will generate targeted questions based on your saved target resume and job analysis.
              </p>
              <button
                onClick={startInterview}
                disabled={starting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Initializing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Begin Mock Interview
                  </>
                )}
              </button>
            </div>

            {sessions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" /> Past Session History
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessions.map((s) => (
                    <div
                      key={getSessionId(s)}
                      className="p-5 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md flex items-center justify-between hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <ScoreRing
                          score={
                            s.report?.overallScore ??
                            s.report?.overall_score ??
                            s.report?.score ??
                            0
                          }
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Session #{getSessionId(s)?.slice(0, 6)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSession(getSessionId(s))}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}