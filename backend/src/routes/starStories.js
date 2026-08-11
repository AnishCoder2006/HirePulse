import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import StarStory from '../models/StarStory.js';
import JobAnalysis from '../models/JobAnalysis.js';
import Resume from '../models/Resume.js';
import { generateStarStories } from '../services/aiServiceClient.js';

const router = Router();

router.use(requireAuth);

// GET /api/star-stories — list user's STAR stories
router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.userId };
    if (req.query.starred === 'true') filter.starred = true;
    if (req.query.analysisId) filter.analysis = req.query.analysisId;

    const stories = await StarStory.find(filter).sort({ starred: -1, updatedAt: -1 });
    res.json({ stories });
  } catch (err) {
    next(err);
  }
});

// POST /api/star-stories/generate — AI-generate stories from a completed analysis
router.post('/generate', async (req, res, next) => {
  try {
    const { analysisId } = req.body;
    if (!analysisId) {
      return res.status(400).json({ error: 'analysisId is required' });
    }

    const record = await JobAnalysis.findOne({ _id: analysisId, user: req.userId });
    if (!record || record.status !== 'complete') {
      return res.status(404).json({ error: 'Completed job analysis not found' });
    }
    if (!record.analysis) {
      return res.status(400).json({ error: 'Analysis data is missing on this record' });
    }

    const resume = await Resume.findOne({ _id: record.resume, user: req.userId });
    if (!resume?.rawText) {
      return res.status(404).json({ error: 'Resume not found for this analysis' });
    }

    const result = await generateStarStories({
      resumeText: resume.rawText,
      jobAnalysis: record.analysis
    });

    const items = Array.isArray(result.stories) ? result.stories : [];
    if (!items.length) {
      return res.status(502).json({ error: 'AI returned no stories. Please try again.' });
    }

    const docs = items.map((s) => ({
      user: req.userId,
      analysis: record._id,
      jobTitle: record.job?.title || '',
      company: record.job?.company || '',
      question: s.question || 'Tell me about a time…',
      situation: s.situation || '',
      task: s.task || '',
      action: s.action || '',
      result: s.result || '',
      resumeSource: s.resume_source || s.resumeSource || '',
      origin: 'generated'
    }));

    const stories = await StarStory.insertMany(docs);
    res.status(201).json({ stories });
  } catch (err) {
    next(err);
  }
});

// POST /api/star-stories — create a manual story
router.post('/', async (req, res, next) => {
  try {
    const { question, situation, task, action, result, resumeSource, jobTitle, company, analysisId, starred } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const story = await StarStory.create({
      user: req.userId,
      analysis: analysisId || undefined,
      jobTitle: jobTitle || '',
      company: company || '',
      question: question.trim(),
      situation: situation || '',
      task: task || '',
      action: action || '',
      result: result || '',
      resumeSource: resumeSource || '',
      starred: Boolean(starred),
      origin: 'manual'
    });

    res.status(201).json({ story });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/star-stories/:id — edit a story
router.patch('/:id', async (req, res, next) => {
  try {
    const story = await StarStory.findOne({ _id: req.params.id, user: req.userId });
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const fields = ['question', 'situation', 'task', 'action', 'result', 'resumeSource', 'jobTitle', 'company', 'starred'];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        story[field] = req.body[field];
      }
    }

    await story.save();
    res.json({ story });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/star-stories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await StarStory.deleteOne({ _id: req.params.id, user: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    res.status(204).json({ message: 'Removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
