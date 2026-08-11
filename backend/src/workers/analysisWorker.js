import 'dotenv/config';
import { Worker } from 'bullmq';
import { redis, createRedisConnection } from '../config/redis.js';
import { connectDB } from '../config/db.js';
import JobAnalysis from '../models/JobAnalysis.js';
import Resume from '../models/Resume.js';
import {
  analyzeJobDescription,
  embedText,
  generateCoverLetter,
  generateInterviewPrep,
  tailorResume
} from '../services/aiServiceClient.js';
import { scoreAts, checkJobTitleMatch, detectKeywordStuffing } from '../services/atsScorer.js';
import { combineScores, semanticScoreFromEmbeddings } from '../services/scoring.js';

async function publishStatus(record) {
  await redis.publish(
    'analysis-updates',
    JSON.stringify({ userId: record.user.toString(), analysisId: record._id.toString(), status: record.status })
  );
}

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
    // Embedding is an enhancement on top of the keyword score, not a
    // required step - if it fails, the analysis should still complete
    // with the keyword-only score rather than failing the whole job.
    console.error('Semantic scoring failed, falling back to keyword-only score:', err.message);
    return { keywordScore: keywordPercentage, semanticScore: null, combinedScore: keywordPercentage };
  }
}

async function processAnalysis(job) {
  const record = await JobAnalysis.findById(job.data.analysisId).populate('resume');
  if (!record) return;

  record.status = 'processing';
  await record.save();
  await publishStatus(record);

  const analysis = await analyzeJobDescription({
    jobTitle: record.job.title,
    company: record.job.company,
    description: record.job.description
  });

  const [tailored, coverLetter, interviewPrep] = await Promise.all([
    tailorResume({ resumeText: record.resume.rawText, jobAnalysis: analysis }),
    generateCoverLetter({ resumeText: record.resume.rawText, jobAnalysis: analysis }),
    generateInterviewPrep({ resumeText: record.resume.rawText, jobAnalysis: analysis })
  ]);

  const atsScore = scoreAts(record.resume.rawText, analysis.keywords_for_ats || []);
  atsScore.jobTitleMatch = checkJobTitleMatch(record.resume.rawText, record.job.title);
  atsScore.stuffing = detectKeywordStuffing(record.resume.rawText);
  const matchScore = await computeMatchScore(record.resume, record.job, atsScore.atsPercentage);

  record.analysis = analysis;
  record.tailoredResume = tailored.resume_text;
  record.coverLetter = coverLetter.cover_letter_text;
  record.interviewPrep = interviewPrep;
  record.atsScore = atsScore;
  record.matchScore = matchScore;
  record.status = 'complete';
  await record.save();
  await publishStatus(record);

  return record;
}

async function start() {
  await connectDB();

  const worker = new Worker(
    'job-analysis',
    async (job) => {
      try {
        return await processAnalysis(job);
      } catch (err) {
        // Only mark the record failed on the final attempt. BullMQ retries
        // the job with exponential backoff, so transient AI-service errors
        // shouldn't permanently fail an analysis - keep it queued between
        // attempts so the frontend keeps polling.
        const isFinalAttempt = job.attemptsMade >= (job.opts?.attempts || 1);
        if (isFinalAttempt) {
          const record = await JobAnalysis.findByIdAndUpdate(
            job.data.analysisId,
            { status: 'failed', error: err.message },
            { new: true }
          );
          if (record) await publishStatus(record);
        }
        throw err;
      }
    },
    { connection: createRedisConnection(), concurrency: 4 }
  );

  worker.on('completed', (job) => console.log(`Analysis ${job.data.analysisId} complete`));
  worker.on('failed', (job, err) => console.error(`Analysis ${job?.data?.analysisId} failed:`, err.message));
}

start();
