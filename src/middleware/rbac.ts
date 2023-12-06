import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, AuthenticationError } from '../utils/errors';

export function requireRoles(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('User not authenticated'));
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      next(
        new ForbiddenError(
          `Required roles: [${allowedRoles.join(', ')}]. User roles: [${userRoles.join(', ')}]`,
        ),
      );
      return;
    }

    next();
  };
}
// Permission checking against route configuration
