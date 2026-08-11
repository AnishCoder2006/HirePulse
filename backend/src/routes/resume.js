import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { requireAuth } from '../middleware/auth.js';
import Resume from '../models/Resume.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    let rawText = req.body.text;
    let fileName;

    if (req.file) {
      const parsed = await pdfParse(req.file.buffer);
      rawText = parsed.text;
      fileName = req.file.originalname;
    }

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Provide a PDF file or resume text' });
    }

    const resume = await Resume.create({ user: req.userId, rawText, fileName });
    res.status(201).json({ resume });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ resumes });
  } catch (err) {
    next(err);
  }
});

export default router;
