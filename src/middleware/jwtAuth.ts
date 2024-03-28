import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwks';
import { AuthenticationError } from '../utils/errors';

export function jwtAuth(issuer: string, audience: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AuthenticationError('Missing Authorization header');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AuthenticationError('Invalid Authorization header format. Expected: Bearer <token>');
      }

      const token = parts[1];
      req.user = await verifyToken(token, issuer, audience);
      next();
    } catch (err) {
      next(err);
    }
  };
}
// Validate issuer and audience claims
