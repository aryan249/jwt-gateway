import * as Sentry from '@sentry/node';

export const initSentry = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
  }
};
