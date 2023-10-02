import { Request, Response, NextFunction } from 'express';

export const rateLimiter = () => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
};
