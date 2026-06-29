import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const getRateLimit = (limit: number, windowStr: `${number} s` | `${number} m` | `${number} h` | `${number} d`) => {
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

