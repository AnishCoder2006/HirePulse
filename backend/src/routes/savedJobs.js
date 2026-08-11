import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import SavedJob, { APPLICATION_STATUSES } from '../models/SavedJob.js';


const router = Router();

router.use(requireAuth);

// Map status → the date field we stamp when entering that stage
const STATUS_DATE_FIELD = {
  applied: 'appliedAt',
  interview: 'interviewAt',
  offer: 'offerAt',
  rejected: 'rejectedAt'
};

// GET /api/saved-jobs — list all jobs saved by the user
// Optional ?status=applied filter
router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.userId };
    if (req.query.status && APPLICATION_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const savedJobs = await SavedJob.find(filter).sort({ updatedAt: -1 });
    res.json({ savedJobs });
  } catch (err) {
    next(err);
  }
});

// GET /api/saved-jobs/stats — pipeline counts + conversion rates for the dashboard
router.get('/stats', async (req, res, next) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);
    const rows = await SavedJob.aggregate([
      { $match: { user: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);


    const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
    for (const row of rows) {
      if (row._id in counts) counts[row._id] = row.count;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    // "Applied+" = anything past saved (applied, interview, offer, rejected)
    const appliedPlus = counts.applied + counts.interview + counts.offer + counts.rejected;
    const interviewPlus = counts.interview + counts.offer;
    const conversions = {
      savedToApplied: total > 0 ? Math.round((appliedPlus / total) * 100) : 0,
      appliedToInterview: appliedPlus > 0 ? Math.round((interviewPlus / appliedPlus) * 100) : 0,
      interviewToOffer: interviewPlus > 0 ? Math.round((counts.offer / interviewPlus) * 100) : 0
    };

    res.json({ counts, total, conversions });
  } catch (err) {
    next(err);
  }
});

// POST /api/saved-jobs — save a job
router.post('/', async (req, res, next) => {
  try {
    const {
      sourceId, source, title, company, location, url, description,
      salaryMin, salaryMax, postedAt, status, notes
    } = req.body;
    if (!sourceId || !title) {
      return res.status(400).json({ error: 'sourceId and title are required' });
    }

    const update = {
      user: req.userId,
      sourceId,
      source: source || 'adzuna',
      title,
      company,
      location,
      url,
      description,
      salaryMin,
      salaryMax,
      postedAt
    };

    // Only set status/notes on create if provided; don't clobber existing tracker data on re-save
    const existing = await SavedJob.findOne({ user: req.userId, sourceId });
    if (!existing) {
      update.status = status && APPLICATION_STATUSES.includes(status) ? status : 'saved';
      update.notes = notes || '';
      update.statusUpdatedAt = new Date();
      if (update.status !== 'saved' && STATUS_DATE_FIELD[update.status]) {
        update[STATUS_DATE_FIELD[update.status]] = new Date();
      }
    }

    const savedJob = await SavedJob.findOneAndUpdate(
      { user: req.userId, sourceId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ savedJob });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/saved-jobs/:id — update tracker fields (status, notes, dates)
router.patch('/:id', async (req, res, next) => {
  try {
    const job = await SavedJob.findOne({ _id: req.params.id, user: req.userId });
    if (!job) return res.status(404).json({ error: 'Saved job not found' });

    const { status, notes, appliedAt, interviewAt, offerAt, rejectedAt } = req.body;

    if (status !== undefined) {
      if (!APPLICATION_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${APPLICATION_STATUSES.join(', ')}` });
      }
      if (status !== job.status) {
        job.status = status;
        job.statusUpdatedAt = new Date();
        // Stamp the milestone date if not already set
        const dateField = STATUS_DATE_FIELD[status];
        if (dateField && !job[dateField]) {
          job[dateField] = new Date();
        }
      }
    }

    if (notes !== undefined) job.notes = String(notes).slice(0, 5000);

    // Allow explicit date overrides from the UI
    for (const [field, value] of Object.entries({ appliedAt, interviewAt, offerAt, rejectedAt })) {
      if (value !== undefined) {
        job[field] = value ? new Date(value) : undefined;
      }
    }

    await job.save();
    res.json({ savedJob: job });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved-jobs/:id — remove a saved job
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await SavedJob.deleteOne({ _id: req.params.id, user: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Saved job not found' });
    }
    res.status(204).json({ message: 'Removed' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved-jobs?sourceId=... — remove by sourceId (used by frontend toggle)
router.delete('/', async (req, res, next) => {
  try {
    const { sourceId } = req.query;
    if (!sourceId) return res.status(400).json({ error: 'sourceId query param is required' });
    const result = await SavedJob.deleteOne({ user: req.userId, sourceId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Saved job not found' });
    }
    res.status(204).json({ message: 'Removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
