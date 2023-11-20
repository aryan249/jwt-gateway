import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { AuthenticationError, ForbiddenError, RateLimitError } from '../../../src/utils/errors';
import * as sentryService from '../../../src/services/sentry';

jest.mock('../../../src/services/sentry');

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = { correlationId: 'test-corr-id' };
    mockRes = { status: statusMock };
    next = jest.fn();
  });

  it('handles AuthenticationError with 401', () => {
    const handler = errorHandler();
    const error = new AuthenticationError('Invalid token');

    handler(error, mockReq as Request, mockRes as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid token' },
      correlationId: 'test-corr-id',
    });
  });

  it('handles ForbiddenError with 403', () => {
    const handler = errorHandler();
    const error = new ForbiddenError();

    handler(error, mockReq as Request, mockRes as Response, next);

    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it('handles RateLimitError with 429', () => {
    const handler = errorHandler();
    const error = new RateLimitError();

    handler(error, mockReq as Request, mockRes as Response, next);

    expect(statusMock).toHaveBeenCalledWith(429);
  });

  it('handles unexpected errors with 500 and reports to Sentry', () => {
    const handler = errorHandler();
    const error = new Error('Unexpected failure');

    handler(error, mockReq as Request, mockRes as Response, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      correlationId: 'test-corr-id',
    });
    expect(sentryService.captureError).toHaveBeenCalledWith(error, {
      correlationId: 'test-corr-id',
    });
  });
});
