import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { captureError } from '../services/sentry';
import { logger } from '../utils/logger';

export function errorHandler() {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    const correlationId = req.correlationId;

    if (res.headersSent) {
      return;
    }

    if (err instanceof AppError) {
      logger.warn('Application error', {
        correlationId,
        code: err.code,
        status: err.statusCode,
        message: err.message,
      });

      if (err.statusCode >= 500) {
        captureError(err, { correlationId });
      }

      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
        correlationId,
      });
      return;
    }

    // Unexpected error
    logger.error('Unhandled error', {
      correlationId,
      error: err.message,
      stack: err.stack,
    });

    captureError(err, { correlationId });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      correlationId,
    });
  };
}
