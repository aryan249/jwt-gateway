import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const correlationId = (req: Request, _res: Response, next: NextFunction): void => {
  const id = req.headers['x-correlation-id'] as string || uuidv4();
  req.correlationId = id;
  next();
};
