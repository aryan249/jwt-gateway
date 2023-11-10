import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { routesConfigSchema } from './schema';
import type { GatewayConfig, ServiceConfig } from '../types';

function loadRoutesFromYaml(filePath: string): ServiceConfig[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const raw = yaml.load(content);
  const parsed = routesConfigSchema.parse(raw);
  return parsed.services;
}

export function loadConfig(routesPath?: string): GatewayConfig {
  const resolvedPath =
    routesPath || path.resolve(__dirname, 'routes.yaml');

  const services = loadRoutesFromYaml(resolvedPath);

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    jwks: {
      uri: process.env.JWKS_URI || 'https://localhost/.well-known/jwks.json',
      issuer: process.env.JWT_ISSUER || 'https://localhost/',
      audience: process.env.JWT_AUDIENCE || 'api',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
    },
    rateLimitFailOpen: process.env.RATE_LIMIT_FAIL_OPEN === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    services,
  };
}
