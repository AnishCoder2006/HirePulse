import { Router } from 'express';
import Resume from '../models/Resume.js';
import JobAnalysis from '../models/JobAnalysis.js';
import {
  analyzeJobDescription,
  embedText,
  generateCoverLetter,
  generateInterviewPrep,
  tailorResume
} from '../services/aiServiceClient.js';
import { scoreAts, checkJobTitleMatch, detectKeywordStuffing } from '../services/atsScorer.js';
import { combineScores, semanticScoreFromEmbeddings } from '../services/scoring.js';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

async function getResumeEmbedding(resume) {
  if (resume.embedding?.length) return resume.embedding;
  const embedding = await embedText(resume.rawText);
  await Resume.findByIdAndUpdate(resume._id, { embedding });
  return embedding;
}

async function computeMatchScore(resume, job, keywordPercentage) {
  try {
    const [resumeEmbedding, jobEmbedding] = await Promise.all([
      getResumeEmbedding(resume),
      embedText(job.description)
    ]);
    const semanticScore = semanticScoreFromEmbeddings(resumeEmbedding, jobEmbedding);
    return { keywordScore: keywordPercentage, semanticScore, combinedScore: combineScores(keywordPercentage, semanticScore) };
  } catch (err) {
    console.error('Semantic scoring failed, falling back to keyword-only score:', err.message);
    return { keywordScore: keywordPercentage, semanticScore: null, combinedScore: keywordPercentage };
  }
}

// Run the full AI pipeline directly (no BullMQ). This runs in the background
// immediately after the 202 response is sent so polling picks it up fast.
async function runAnalysis(record, resume) {
  try {
    record.status = 'processing';
    await record.save();

    const analysis = await analyzeJobDescription({
      jobTitle: record.job.title,
      company: record.job.company,
      description: record.job.description
    });

    const [tailored, coverLetter, interviewPrep] = await Promise.all([
      tailorResume({ resumeText: resume.rawText, jobAnalysis: analysis }),
      generateCoverLetter({ resumeText: resume.rawText, jobAnalysis: analysis }),
      generateInterviewPrep({ resumeText: resume.rawText, jobAnalysis: analysis })
    ]);

    const atsScore = scoreAts(resume.rawText, analysis.keywords_for_ats || []);
    atsScore.jobTitleMatch = checkJobTitleMatch(resume.rawText, record.job.title);
    atsScore.stuffing = detectKeywordStuffing(resume.rawText);
    const matchScore = await computeMatchScore(resume, record.job, atsScore.atsPercentage);

    record.analysis = analysis;
    record.tailoredResume = tailored.resume_text;
    record.coverLetter = coverLetter.cover_letter_text;
    record.interviewPrep = interviewPrep;
    record.atsScore = atsScore;
    record.matchScore = matchScore;
    record.status = 'complete';
    await record.save();
    console.log(`Analysis ${record._id} complete`);
  } catch (err) {
    console.error(`Analysis ${record._id} failed:`, err.message);
    record.status = 'failed';
    record.error = err.message;
    await record.save();
  }
}

// ── routes ───────────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { resumeId, job } = req.body;
    if (!resumeId || !job?.title || !job?.description) {
      return res.status(400).json({ error: 'resumeId and job {title, description} are required' });
    }

    const resume = await Resume.findOne({ _id: resumeId, user: req.userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const record = await JobAnalysis.create({
      user: req.userId,
      resume: resume._id,
      job,
      status: 'queued'
    });

    // Kick off the pipeline in the background; client polls /analysis/:id
    setImmediate(() => runAnalysis(record, resume));

    res.status(202).json({ analysis: record });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const analysis = await JobAnalysis.findOne({ _id: req.params.id, user: req.userId });
    if (!analysis) return res.status(404).json({ error: 'Not found' });

    // Auto-fail jobs stuck for > 5 minutes (safety net for truly broken runs)
    if ((analysis.status === 'queued' || analysis.status === 'processing') &&
        (Date.now() - new Date(analysis.updatedAt || analysis.createdAt).getTime() > 300000)) {
      analysis.status = 'failed';
      analysis.error = 'Analysis timed out. Please try again.';
      await analysis.save();
    }

    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const analyses = await JobAnalysis.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json({ analyses });
  } catch (err) {
    next(err);
  }
});

export default router;
