import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared client for simple get/set/publish commands.
export const redis = new Redis(REDIS_URL);

// BullMQ and Redis subscribers need their own connection with
// maxRetriesPerRequest disabled, since they issue blocking commands.
export function createRedisConnection() {
  return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
}
