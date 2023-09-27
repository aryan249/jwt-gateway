import { loadConfig } from './config';
import { createApp } from './app';
import { disconnectRedis } from './services/redis';
import { logger } from './utils/logger';

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.port, () => {
  logger.info(`JWT Gateway listening on port ${config.port}`, {
    services: config.services.map((s) => s.name),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
  });
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await disconnectRedis();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
