import { Router } from 'express';
import { isRedisHealthy } from '../services/redis';
import { getJwksClient } from '../services/jwks';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req, res) => {
  const checks: Record<string, boolean> = {};

  checks.redis = await isRedisHealthy();
  checks.jwks = getJwksClient() !== null;

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
