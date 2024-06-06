import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('request completed', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        correlationId: req.correlationId,
        userAgent: req.headers['user-agent'],
        contentLength: res.getHeader('content-length'),
      });
    });

    next();
  };
}
// Request body sanitization before logging
