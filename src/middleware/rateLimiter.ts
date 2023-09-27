import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../services/redis';
import { RateLimitError } from '../utils/errors';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  failOpen?: boolean;
}

export function rateLimiter(config: RateLimitConfig) {
  const { windowMs, max, failOpen = false } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const redis = getRedisClient();
    if (!redis) {
      if (failOpen) {
        next();
        return;
      }
      next(new RateLimitError('Rate limiter unavailable'));
      return;
    }

    const identifier = req.user?.sub || req.ip || 'unknown';
    const key = `rl:${identifier}:${req.baseUrl}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Count current entries
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
      // Set expiry on the key
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();
      const count = results?.[1]?.[1] as number;

      // Set rate limit headers
      const remaining = Math.max(0, max - count - 1);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      res.setHeader('X-RateLimit-Policy', `${max};w=${Math.ceil(windowMs / 1000)}`);

      if (count >= max) {
        next(new RateLimitError());
        return;
      }

      next();
    } catch (err) {
      logger.warn('Rate limiter error', { error: (err as Error).message });
      if (failOpen) {
        next();
      } else {
        next(new RateLimitError('Rate limiter unavailable'));
      }
    }
  };
}
// Per-route rate limit configuration
