import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get profile — returns the logged-in user's profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: user });
  } catch (err) {
    next(err);
  }
});

// Update profile — only updates fields that are sent
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const allowed = [
      'name', 'title', 'phone', 'location',
      'githubUrl', 'linkedinUrl', 'leetcodeUrl', 'portfolioUrl',
      'skills', 'summary', 'dob', 'gender'
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Basic validation
    if (updates.name !== undefined && !updates.name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (updates.email !== undefined) {
      return res.status(400).json({ error: 'Email cannot be updated through this endpoint' });
    }
    if (updates.githubUrl !== undefined && updates.githubUrl && !updates.githubUrl.match(/^https?:\/\/github\.com\/.+/)) {
      return res.status(400).json({ error: 'GitHub URL must start with https://github.com/' });
    }
    if (updates.linkedinUrl !== undefined && updates.linkedinUrl && !updates.linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/.+/)) {
      return res.status(400).json({ error: 'LinkedIn URL must start with https://linkedin.com/' });
    }
    if (updates.leetcodeUrl !== undefined && updates.leetcodeUrl && !updates.leetcodeUrl.match(/^https?:\/\/leetcode\.com\/.+/)) {
      return res.status(400).json({ error: 'LeetCode URL must start with https://leetcode.com/' });
    }
    if (updates.portfolioUrl !== undefined && updates.portfolioUrl && !updates.portfolioUrl.match(/^https?:\/\/.+/)) {
      return res.status(400).json({ error: 'Portfolio URL must start with https://' });
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: user });
  } catch (err) {
    next(err);
  }
});

export default router;