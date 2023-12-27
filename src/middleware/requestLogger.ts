import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request completed', { method: req.method, url: req.url, duration: Date.now() - start });
  });
  next();
};
