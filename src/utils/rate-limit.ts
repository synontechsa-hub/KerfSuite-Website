import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitWindow = `${number} s` | `${number} m` | `${number} h` | `${number} d`

export const getRateLimit = (limit: number, windowStr: RateLimitWindow) => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, windowStr),
    analytics: true,
  });
};

