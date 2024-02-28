import { Request, Response } from 'express';
import { rateLimiter } from '../../../src/middleware/rateLimiter';
import * as redisService from '../../../src/services/redis';
import { RateLimitError } from '../../../src/utils/errors';

jest.mock('../../../src/services/redis');

describe('rateLimiter middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: jest.Mock;
  const mockGetRedisClient = redisService.getRedisClient as jest.MockedFunction<
    typeof redisService.getRedisClient
  >;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      baseUrl: '/api/test',
      user: undefined,
    };
    mockRes = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('allows requests under the limit', async () => {
    const mockPipeline = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0], // zremrangebyscore
        [null, 5], // zcard - 5 requests (under limit of 10)
        [null, 1], // zadd
        [null, 1], // pexpire
      ]),
    };
    mockGetRedisClient.mockReturnValue({ pipeline: () => mockPipeline } as never);

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
  });

  it('rejects requests over the limit', async () => {
    const mockPipeline = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0],
        [null, 10], // at limit
        [null, 1],
        [null, 1],
      ]),
    };
    mockGetRedisClient.mockReturnValue({ pipeline: () => mockPipeline } as never);

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(RateLimitError));
  });

  it('fails open when configured and Redis is unavailable', async () => {
    mockGetRedisClient.mockReturnValue(null);

    const middleware = rateLimiter({ windowMs: 60000, max: 10, failOpen: true });
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('fails closed by default when Redis is unavailable', async () => {
    mockGetRedisClient.mockReturnValue(null);

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(RateLimitError));
  });
});
