import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

function issueToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, dob, gender } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password and name are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name, dob, gender });
    res.status(201).json({ token: issueToken(user), user: { id: user._id, email: user.email, name: user.name, dob: user.dob, gender: user.gender } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: issueToken(user), user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

export default router;
