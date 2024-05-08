import request from 'supertest';
import path from 'path';
import { createApp } from '../../src/app';
import { disconnectRedis } from '../../src/services/redis';
import type { GatewayConfig } from '../../src/types';
import { loadConfig } from '../../src/config';

describe('Health endpoints', () => {
  const routesPath = path.resolve(__dirname, '../../src/config/routes.yaml');

  afterEach(async () => {
    await disconnectRedis();
  });

  it('GET /health returns 200', async () => {
    const config: GatewayConfig = {
      ...loadConfig(routesPath),
      redis: { url: 'redis://localhost:6379' },
      sentry: { dsn: '' },
    };
    const app = createApp(config);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health includes correlation ID in response', async () => {
    const config: GatewayConfig = {
      ...loadConfig(routesPath),
      redis: { url: 'redis://localhost:6379' },
      sentry: { dsn: '' },
    };
    const app = createApp(config);

    const res = await request(app).get('/health');

    expect(res.headers['x-request-id']).toBeDefined();
  });
});
