import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export function createServiceProxy(upstream: string, stripPrefix?: string) {
  const options: Options = {
    target: upstream,
    changeOrigin: true,
    timeout: 3000,
    proxyTimeout: 3000,
    pathRewrite: stripPrefix ? { [`^${stripPrefix}`]: '' } : undefined,
    on: {
      proxyReq: (proxyReq, req) => {
        const expressReq = req as Request;
        if (expressReq.correlationId) {
          proxyReq.setHeader('X-Request-ID', expressReq.correlationId);
        }
        if (expressReq.user) {
          proxyReq.setHeader('X-User-Sub', expressReq.user.sub);
          proxyReq.setHeader('X-User-Roles', expressReq.user.roles.join(','));
        }
      },
      proxyRes: (_proxyRes, req) => {
        const expressReq = req as Request;
        logger.debug('Proxy response received', {
          correlationId: expressReq.correlationId,
          target: upstream,
        });
      },
      error: (err, req, res) => {
        const expressReq = req as Request;
        const expressRes = res as Response;
        logger.error('Proxy error', {
          correlationId: expressReq.correlationId,
          target: upstream,
          error: err.message,
        });
        if (!expressRes.headersSent) {
          expressRes.status(502).json({
            error: {
              code: 'BAD_GATEWAY',
              message: 'Upstream service unavailable',
            },
            correlationId: expressReq.correlationId,
          });
        }
      },
    },
  };

  return createProxyMiddleware(options);
}
