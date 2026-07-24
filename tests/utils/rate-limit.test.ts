/**
 * Unit tests for src/utils/rate-limit.ts getRateLimit factory.
 */
const RedisCtor = jest.fn();
const RatelimitCtor = jest.fn();
const slidingWindow = jest.fn(() => 'sliding-window-limiter');

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation((...args: unknown[]) => RedisCtor(...args)),
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation((...args: unknown[]) => RatelimitCtor(...args)),
    { slidingWindow },
  ),
}));

import { getRateLimit } from '@/utils/rate-limit';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('getRateLimit', () => {
  it('returns null when Upstash env vars are not configured', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(getRateLimit(10, '60 s')).toBeNull();
    expect(RedisCtor).not.toHaveBeenCalled();
    expect(RatelimitCtor).not.toHaveBeenCalled();
  });

  it('returns null when only one of the two env vars is present', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(getRateLimit(10, '60 s')).toBeNull();
  });

  it('constructs a Ratelimit with a sliding window when configured', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token-123';

    const limiter = getRateLimit(25, '1 h');

    expect(limiter).not.toBeNull();
    expect(RedisCtor).toHaveBeenCalledWith({
      url: 'https://example.upstash.io',
      token: 'token-123',
    });
    expect(slidingWindow).toHaveBeenCalledWith(25, '1 h');
    expect(RatelimitCtor).toHaveBeenCalledTimes(1);
    const config = RatelimitCtor.mock.calls[0][0];
    expect(config.limiter).toBe('sliding-window-limiter');
    expect(config.analytics).toBe(true);
  });
});
