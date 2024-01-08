import { Request, Response, NextFunction } from 'express';
import { correlationId } from '../../../src/middleware/correlationId';

describe('correlationId middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('generates a UUID when no X-Request-ID header is present', () => {
    const middleware = correlationId();
    middleware(mockReq as Request, mockRes as Response, next);

    expect(mockReq.correlationId).toBeDefined();
    expect(mockReq.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.correlationId);
    expect(next).toHaveBeenCalled();
  });

  it('uses existing X-Request-ID header when present', () => {
    const existingId = 'existing-correlation-id';
    mockReq.headers = { 'x-request-id': existingId };

    const middleware = correlationId();
    middleware(mockReq as Request, mockRes as Response, next);

    expect(mockReq.correlationId).toBe(existingId);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
    expect(next).toHaveBeenCalled();
  });
});
