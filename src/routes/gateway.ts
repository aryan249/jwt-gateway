import { Router } from 'express';
import { jwtAuth, requireRoles, rateLimiter } from '../middleware';
import { createServiceProxy } from '../services/proxy';
import { logger } from '../utils/logger';
import type { GatewayConfig } from '../types';

export function createGatewayRouter(config: GatewayConfig): Router {
  const router = Router();

  for (const service of config.services) {
    logger.info(`Registering route: ${service.prefix} -> ${service.upstream}`, {
      service: service.name,
      roles: service.roles,
      rateLimit: `${service.rateLimit.max} req / ${service.rateLimit.windowMs}ms`,
    });

    const middlewares = [
      rateLimiter({
        windowMs: service.rateLimit.windowMs,
        max: service.rateLimit.max,
        failOpen: config.rateLimitFailOpen,
      }),
      jwtAuth(config.jwks.issuer, config.jwks.audience),
      requireRoles(service.roles),
    ];

    const proxy = createServiceProxy(
      service.upstream,
      service.stripPrefix ? service.prefix : undefined,
    );

    router.use(service.prefix, ...middlewares, proxy);
  }

  return router;
}
// Add X-Forwarded-For and X-Request-ID headers
