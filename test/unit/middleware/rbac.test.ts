import { Request, Response } from 'express';
import { requireRoles } from '../../../src/middleware/rbac';
import { ForbiddenError, AuthenticationError } from '../../../src/utils/errors';

describe('requireRoles middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    next = jest.fn();
  });

  it('rejects unauthenticated requests', () => {
    const middleware = requireRoles(['admin']);
    middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
  });

  it('allows users with matching role', () => {
    mockReq.user = { sub: 'user-1', roles: ['admin', 'user'] };

    const middleware = requireRoles(['admin']);
    middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects users without matching role', () => {
    mockReq.user = { sub: 'user-1', roles: ['user'] };

    const middleware = requireRoles(['admin', 'billing']);
    middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('rejects users with empty roles', () => {
    mockReq.user = { sub: 'user-1', roles: [] };

    const middleware = requireRoles(['admin']);
    middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
