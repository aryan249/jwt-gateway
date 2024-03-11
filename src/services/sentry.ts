import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger';

let initialized = false;

export function initSentry(dsn: string): void {
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    serverName: process.env.HOSTNAME || 'jwt-gateway',
  });

  initialized = true;
  logger.info('Sentry initialized');
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export { Sentry };
// Sentry request and error handlers
