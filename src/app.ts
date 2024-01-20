import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { correlationId, requestLogger, errorHandler } from './middleware';
import { initSentry, Sentry } from './services/sentry';
import { createRedisClient } from './services/redis';
import { initJwksClient } from './services/jwks';
import healthRouter from './routes/health';
import { createGatewayRouter } from './routes/gateway';
import type { GatewayConfig } from './types';

export function createApp(config: GatewayConfig) {
  // Initialize services
  initSentry(config.sentry.dsn);
  createRedisClient(config.redis.url);
  initJwksClient(config.jwks.uri);

  const app = express();

  // Sentry request handler (must be first)
  if (config.sentry.dsn) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // Security and CORS
  app.use(helmet());
  app.use(cors());
  app.disable('x-powered-by');
  app.use(correlationId());
  app.use(requestLogger());

  // Health checks (no auth required)
  app.use(healthRouter);

  // Gateway routes (auth + RBAC)
  const gatewayRouter = createGatewayRouter(config);
  app.use(gatewayRouter);

  // Sentry error handler
  if (config.sentry.dsn) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // Error handler (must be last)
  app.use(errorHandler());

  return app;
}
