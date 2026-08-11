import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/redis.js';
import JobAnalysis from '../models/JobAnalysis.js';
import Resume from '../models/Resume.js';
import InterviewSession from '../models/InterviewSession.js';
import { requireAuth } from '../middleware/auth.js';
import { generateInterviewReport, interviewStep } from '../services/aiServiceClient.js';

const router = express.Router();

router.use(requireAuth);

/**
 * Normalizes report objects so both camelCase and snake_case properties
 * from AI or local fallback are cleanly mapped for the frontend.
 */
function normalizeReport(report, history = []) {
  if (!report) return null;

  // Extract question breakdown or map from history
  const questionBreakdown =
    report.questionBreakdown ||
    report.per_question_breakdown ||
    report.question_breakdown ||
    history.map((h) => ({
      question: h.question,
      score: h.evaluation?.score ?? 0,
      feedback: h.evaluation?.feedback || ''
    }));

  const overallScore =
    report.overallScore ??
    report.overall_score ??
    report.score ??
    (questionBreakdown.length
      ? Math.round(questionBreakdown.reduce((sum, q) => sum + (q.score || 0), 0) / questionBreakdown.length)
      : 0);

  return {
    ...report,
    overallScore,
    overall_score: overallScore,
    strengths: report.strengths || [],
    weaknesses: report.weaknesses || [],
    topicsCovered: report.topicsCovered || report.topics_covered || [],
    topicsMissed: report.topicsMissed || report.topics_missed || [],
    questionBreakdown: questionBreakdown.map((q) => ({
      question: q.question || q.questionText || '',
      score: q.score ?? q.evaluation?.score ?? 0,
      feedback: q.feedback || q.evaluation?.feedback || ''
    }))
  };
}

// Builds a report card locally from the evaluations in the history — used as
// a fallback if the AI report generation is unavailable.
function buildLocalReport(history, jobTitle) {
  const scores = history.map((h) => h.evaluation?.score ?? 0);
  const overall = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const highs = history.filter((h) => (h.evaluation?.score ?? 0) >= 70);
  const lows = history.filter((h) => (h.evaluation?.score ?? 0) < 60);

  return normalizeReport({
    overallScore: overall,
    summary: `You answered ${history.length} question${history.length === 1 ? '' : 's'} for ${jobTitle || 'this role'}, with an average score of ${overall}%. Review the per-question feedback below to target your weakest areas.`,
    strengths: highs.map((h) => h.evaluation?.feedback || `Strong answer on: ${h.question}`).slice(0, 5),
    weaknesses: lows.map((h) => h.evaluation?.feedback || `Needs improvement: ${h.question}`).slice(0, 5),
    topicsCovered: highs.map((h) => h.evaluation?.topic || h.question).slice(0, 8),
    topicsMissed: lows.map((h) => h.evaluation?.topic || h.question).slice(0, 8),
    questionBreakdown: history.map((h) => ({
      question: h.question,
      score: h.evaluation?.score ?? 0,
      feedback: h.evaluation?.feedback || ''
    })),
    recommendations: [
      'Revisit the questions you scored below 60% and prepare structured answers.',
      'Practice explaining your technical decisions out loud to build fluency.',
      'Use the STAR method for any behavioral questions you missed.'
    ]
  }, history);
}

// POST /api/interview-sessions — start a new mock interview session.
router.post('/', async (req, res, next) => {
  try {
    const { analysisId } = req.body;
    if (!analysisId) return res.status(400).json({ error: 'analysisId is required' });

    const record = await JobAnalysis.findOne({ _id: analysisId, user: req.userId });
    if (!record || record.status !== 'complete') {
      return res.status(404).json({ error: 'Completed job analysis not found' });
    }

    const questions = record.interviewPrep?.likely_questions || [];
    if (!questions.length) {
      return res.status(400).json({ error: 'No interview prep questions available for this analysis.' });
    }

    const resume = await Resume.findOne({ _id: record.resume, user: req.userId });

    const session = await InterviewSession.create({
      user: req.userId,
      analysis: record._id,
      job: {
        title: record.job?.title || '',
        company: record.job?.company || '',
        location: record.job?.location || '',
        url: record.job?.url || ''
      },
      status: 'in_progress',
      history: [],
      questionCount: 0,
      maxQuestions: Math.min(questions.length, 8),
      report: null
    });

    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      mongoId: session._id.toString(),
      analysisId: record._id.toString(),
      resumeText: resume?.rawText || '',
      questions,
      currentIndex: 0,
      history: []
    };

    await redis.set(`interview_session:${sessionId}`, JSON.stringify(sessionData), 'EX', 3600);

    res.json({
      sessionId,
      question: questions[0]
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/interview-sessions/:id/answer — evaluate the answer & persist report.
router.post('/:id/answer', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    if (!answer) return res.status(400).json({ error: 'Answer is required' });

    const sessionRaw = await redis.get(`interview_session:${id}`);
    if (!sessionRaw) return res.status(404).json({ error: 'Session not found or expired' });
    const session = JSON.parse(sessionRaw);

    const record = await JobAnalysis.findOne({ _id: session.analysisId, user: req.userId });
    if (!record) return res.status(404).json({ error: 'Associated job analysis not found' });

    const currentQuestion = session.questions[session.currentIndex];

    const step = await interviewStep({
      jobAnalysis: record.analysis,
      resumeText: session.resumeText,
      history: session.history,
      currentQuestion,
      currentAnswer: answer,
      questionCount: session.history.length,
      maxQuestions: session.maxQuestions
    });

    session.history = step.history || session.history;
    session.currentIndex = session.history.length;

    const isComplete = Boolean(step.complete);
    let nextQuestion = step.next_question || null;
    let report = step.report || null;

    if (!isComplete && !nextQuestion) {
      if (session.currentIndex < session.questions.length) {
        nextQuestion = session.questions[session.currentIndex];
      }
    }

    const isFinal = isComplete || nextQuestion === null;

    if (isFinal && !report) {
      try {
        const rawReport = await generateInterviewReport({
          jobAnalysis: record.analysis,
          resumeText: session.resumeText,
          history: session.history
        });
        report = normalizeReport(rawReport, session.history);
      } catch (err) {
        console.error('Interview report generation failed on completion, using fallback:', err.message);
        report = buildLocalReport(session.history, record.job?.title);
      }
    } else if (report) {
      report = normalizeReport(report, session.history);
    }

    const mongoSession = await InterviewSession.findById(session.mongoId);
    if (mongoSession) {
      mongoSession.history = session.history;
      mongoSession.questionCount = session.history.length;
      if (isFinal) {
        mongoSession.status = 'complete';
        mongoSession.report = report;
        mongoSession.completedAt = new Date();
      }
      await mongoSession.save();
    }

    await redis.set(`interview_session:${id}`, JSON.stringify(session), 'EX', 3600);

    res.json({
      evaluation: step.evaluation,
      nextQuestion,
      complete: isFinal,
      summary: isFinal
        ? `Mock interview complete! You answered ${session.history.length} questions. Your report card is saved — you can review it anytime.`
        : null,
      report: report || null
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/interview-sessions/:id/finish — end session early & generate report.
router.post('/:id/finish', async (req, res, next) => {
  try {
    const { id } = req.params;

    const sessionRaw = await redis.get(`interview_session:${id}`);
    if (!sessionRaw) return res.status(404).json({ error: 'Session not found or expired' });
    const session = JSON.parse(sessionRaw);

    const record = await JobAnalysis.findOne({ _id: session.analysisId, user: req.userId });
    if (!record) return res.status(404).json({ error: 'Associated job analysis not found' });

    if (!session.history?.length) {
      const mongoSession = await InterviewSession.findById(session.mongoId);
      if (mongoSession) {
        mongoSession.history = session.history;
        mongoSession.questionCount = session.history.length;
        mongoSession.status = 'complete';
        mongoSession.report = null;
        mongoSession.completedAt = new Date();
        await mongoSession.save();
      }
      await redis.del(`interview_session:${id}`);
      return res.json({ report: null, sessionId: id, usedFallback: false });
    }

    let report = null;
    let usedFallback = false;
    try {
      const rawReport = await generateInterviewReport({
        jobAnalysis: record.analysis,
        resumeText: session.resumeText,
        history: session.history
      });
      report = normalizeReport(rawReport, session.history);
    } catch (err) {
      console.error('AI report generation failed, using local fallback:', err.message);
      report = buildLocalReport(session.history, record.job?.title);
      usedFallback = true;
    }

    const mongoSession = await InterviewSession.findById(session.mongoId);
    if (mongoSession) {
      mongoSession.history = session.history;
      mongoSession.questionCount = session.history.length;
      mongoSession.status = 'complete';
      mongoSession.report = report;
      mongoSession.completedAt = new Date();
      await mongoSession.save();
    }

    await redis.del(`interview_session:${id}`);

    res.json({ report, sessionId: id, usedFallback });
  } catch (err) {
    next(err);
  }
});

// GET /api/interview-sessions — list user past sessions.
router.get('/', async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Normalize historical reports on retrieve
    const normalizedSessions = sessions.map((s) => {
      const doc = s.toObject();
      if (doc.report) {
        doc.report = normalizeReport(doc.report, doc.history || []);
      }
      return doc;
    });

    res.json({ sessions: normalizedSessions });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/interview-sessions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const session = await InterviewSession.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!session) return res.status(404).json({ error: 'Interview session not found' });
    await redis.del(`interview_session:${session._id.toString()}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/interview-sessions/:id/delete
router.post('/:id/delete', async (req, res, next) => {
  try {
    const session = await InterviewSession.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!session) return res.status(404).json({ error: 'Interview session not found' });
    await redis.del(`interview_session:${session._id.toString()}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/interview-sessions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, user: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const doc = session.toObject();
    if (doc.report) {
      doc.report = normalizeReport(doc.report, doc.history || []);
    }

    res.json({ session: doc });
  } catch (err) {
    next(err);
  }
});

export default router;