import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

export const analysisQueue = new Queue('job-analysis', { connection: createRedisConnection() });

// Drain leftover ghost jobs from previous app runs on startup so new requests run immediately
analysisQueue.drain().catch(() => {});

export const ANALYSIS_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }
};
