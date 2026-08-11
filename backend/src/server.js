import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { connectDB, closeDB } from './config/db.js';
import { initSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import resumeRoutes from './routes/resume.js';
import analysisRoutes from './routes/analysis.js';
import interviewRoutes from './routes/interview.js';
import profileRoutes from './routes/profile.js';
import savedJobsRoutes from './routes/savedJobs.js';
import starStoriesRoutes from './routes/starStories.js';
import { errorHandler } from './middleware/errorHandler.js';

import { requestLogger } from './middleware/requestLogger.js';
import { requireAuth } from './middleware/auth.js';
import { searchLimiter, analysisLimiter, authLimiter } from './middleware/rateLimiter.js';
import Redis from 'ioredis';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// ✅ Redis connection
const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
  console.log(`✅ Redis connected on ${process.env.REDIS_URL}`);
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// Health check — used by Docker/K8s to know the service is alive.
// In interviews you can mention: "a /health endpoint lets orchestration
// tools know the service is ready to receive traffic."
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Readiness check — verifies critical dependencies are connected.
// This is more thorough than a simple health check.
app.get('/ready', async (req, res) => {
  try {
    // Quick Redis ping
    await redis.ping();
    res.json({ status: 'ready', redis: 'connected' });
  } catch {
    res.status(503).json({ status: 'not ready', redis: 'disconnected' });
  }
});

app.use('/api/auth', authLimiter, authRoutes);
// requireAuth runs before the limiter so the token bucket is keyed by
// userId rather than a shared IP (NAT/proxy would otherwise lump all
// users into one bucket).
app.use('/api/jobs', requireAuth, searchLimiter, jobRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/analysis', requireAuth, analysisLimiter, analysisRoutes);
app.use('/api/interview-sessions', interviewRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/saved-jobs', savedJobsRoutes);
app.use('/api/star-stories', starStoriesRoutes);

app.use(errorHandler);


const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`API listening on port ${PORT}`));
});

// ✅ Graceful shutdown — close DB, Redis, and HTTP server cleanly.
// In an interview: "graceful shutdown ensures in-flight requests complete
// and connections are closed properly when the service is restarted."
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully...');
  server.close(async () => {
    await redis.quit();
    await closeDB();
    console.log('Shutdown complete.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received — shutting down gracefully...');
  server.close(async () => {
    await redis.quit();
    await closeDB();
    console.log('Shutdown complete.');
    process.exit(0);
  });
});