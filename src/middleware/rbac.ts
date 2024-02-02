import { Request, Response, NextFunction } from 'express';

export const rbac = (requiredRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    next();
  };
};
