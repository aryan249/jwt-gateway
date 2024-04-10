import { Request, Response } from 'express';
import { jwtAuth } from '../../../src/middleware/jwtAuth';
import * as jwksService from '../../../src/services/jwks';
import { AuthenticationError } from '../../../src/utils/errors';

jest.mock('../../../src/services/jwks');

describe('jwtAuth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: jest.Mock;
  const mockVerifyToken = jwksService.verifyToken as jest.MockedFunction<
    typeof jwksService.verifyToken
  >;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {};
    next = jest.fn();
  });

  it('rejects requests without Authorization header', async () => {
    const middleware = jwtAuth('issuer', 'audience');
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
  });

  it('rejects requests with invalid Authorization format', async () => {
    mockReq.headers = { authorization: 'InvalidFormat token123' };

    const middleware = jwtAuth('issuer', 'audience');
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
  });

  it('attaches user payload on valid token', async () => {
    const payload = { sub: 'user-1', roles: ['admin'] };
    mockVerifyToken.mockResolvedValue(payload);
    mockReq.headers = { authorization: 'Bearer valid-token' };

    const middleware = jwtAuth('issuer', 'audience');
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(mockReq.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes verification errors to next', async () => {
    mockVerifyToken.mockRejectedValue(new AuthenticationError('Token expired'));
    mockReq.headers = { authorization: 'Bearer expired-token' };

    const middleware = jwtAuth('issuer', 'audience');
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
  });
});
