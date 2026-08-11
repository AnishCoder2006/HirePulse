import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis.js';

// Rate limit for auth endpoints - IP-based since there's no user yet.
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a moment.' }
});

// Atomic token-bucket refill + consume. Returns 1 if allowed, 0 if not.
// The bucket is a Redis hash { tokens, ts } so refill is based on elapsed
// time rather than a fixed window - a user who makes 5 requests then waits
// a minute gets their tokens back gradually instead of all at once.
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local refillPerSecond = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(bucket[1] or maxTokens)
local ts = tonumber(bucket[2] or now)

local elapsed = math.max(0, now - ts)
tokens = math.min(maxTokens, tokens + elapsed * refillPerSecond)

if tokens >= cost then
  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('EXPIRE', key, 60)
  return 1
else
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('EXPIRE', key, 60)
  return 0
end
`;

// Redis-backed token-bucket limiter keyed by user id (falls back to IP).
// Unlike the IP-based express-rate-limit above, this gives each user their
// own bucket, so one user hammering the API can't exhaust a shared IP bucket
// (e.g. everyone behind the same NAT or corporate proxy).
export function createTokenBucketLimiter({ max, refillPerSecond, message }) {
  return async function tokenBucketLimiter(req, res, next) {
    try {
      const key = `rl:${req.userId || req.ip}`;
      const allowed = await redis.eval(
        TOKEN_BUCKET_SCRIPT,
        1,
        key,
        max,
        refillPerSecond,
        Math.floor(Date.now() / 1000),
        1
      );
      if (allowed === 1) return next();
      res.status(429).json({ error: message });
    } catch (err) {
      // Fail open - if Redis is down, don't block traffic because of the limiter.
      console.error('Rate limiter error (failing open):', err.message);
      next();
    }
  };
}

// Per-user limits for search and analysis. 30/min for search, 10/min for analysis.
export const searchLimiter = createTokenBucketLimiter({
  max: 30,
  refillPerSecond: 30 / 60,
  message: 'Too many search requests. Please wait a moment before trying again.'
});

export const analysisLimiter = createTokenBucketLimiter({
  max: 10,
  refillPerSecond: 10 / 60,
  message: 'Too many analysis requests. Please wait a moment before trying again.'
});