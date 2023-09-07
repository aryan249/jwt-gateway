import request from 'supertest';
import path from 'path';
import { createApp } from '../../src/app';
import { disconnectRedis } from '../../src/services/redis';
import { loadConfig } from '../../src/config';
import { createTestToken, createExpiredToken, TEST_ISSUER, TEST_AUDIENCE } from './helpers/fixtures';
import { startJwksServer, stopJwksServer, getJwksUrl } from './helpers/setup';
import type { GatewayConfig } from '../../src/types';

describe('Gateway integration', () => {
  let config: GatewayConfig;

  beforeAll(async () => {
    await startJwksServer();
    const routesPath = path.resolve(__dirname, '../../src/config/routes.yaml');
    config = {
      ...loadConfig(routesPath),
      jwks: {
        uri: getJwksUrl(),
        issuer: TEST_ISSUER,
        audience: TEST_AUDIENCE,
      },
      redis: { url: 'redis://localhost:6379' },
      sentry: { dsn: '' },
      rateLimitFailOpen: true, // Don't fail on Redis unavailability in tests
    };
  });

  afterAll(async () => {
    await disconnectRedis();
    await stopJwksServer();
  });

  it('rejects requests without auth token', async () => {
    const app = createApp(config);
    const res = await request(app).get('/api/users/profile');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(res.body.correlationId).toBeDefined();
  });

  it('rejects expired tokens', async () => {
    const app = createApp(config);
    const token = createExpiredToken();

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('rejects users without required role', async () => {
    const app = createApp(config);
    const token = createTestToken({ roles: ['user'] });

    // billing-service requires 'admin' or 'billing' role
    const res = await request(app)
      .get('/api/billing/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('accepts valid token with correct role (auth passes, proxy may fail)', async () => {
    const app = createApp(config);
    const token = createTestToken({ roles: ['admin'] });

    // user-service accepts 'admin' role - auth and RBAC pass
    // Proxy will error since upstream doesn't exist, yielding 500/502
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .timeout(8000);

    // Auth and RBAC passed (not 401 or 403)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  }, 10000);

  it('includes correlation ID in all responses', async () => {
    const app = createApp(config);
    const customId = 'my-trace-id-123';

    const res = await request(app)
      .get('/api/users/profile')
      .set('X-Request-ID', customId);

    expect(res.headers['x-request-id']).toBe(customId);
  });
});
