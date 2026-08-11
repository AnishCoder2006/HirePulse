import { Router } from 'express';
import { searchJobs } from '../services/adzunaClient.js';
import { importJobFromUrl } from '../services/jobUrlImporter.js';

const router = Router();

router.get('/search', async (req, res, next) => {
  try {
    const { keyword, location, page } = req.query;
    if (!keyword) return res.status(400).json({ error: 'keyword is required' });

    const jobs = await searchJobs({ keyword, location, page: Number(page) || 1 });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/import-url — scrape + extract a job posting from any URL
router.post('/import-url', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    const job = await importJobFromUrl(url.trim());
    res.json({ job });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

export default router;

