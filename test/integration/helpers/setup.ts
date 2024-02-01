import http from 'http';
import { jwksResponse } from './fixtures';

let jwksServer: http.Server | null = null;
let jwksPort = 0;

export function getJwksUrl(): string {
  return `http://127.0.0.1:${jwksPort}/.well-known/jwks.json`;
}

export async function startJwksServer(): Promise<void> {
  return new Promise((resolve) => {
    jwksServer = http.createServer((req, res) => {
      if (req.url === '/.well-known/jwks.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jwksResponse));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    jwksServer.listen(0, '127.0.0.1', () => {
      const addr = jwksServer!.address();
      if (addr && typeof addr !== 'string') {
        jwksPort = addr.port;
      }
      resolve();
    });
  });
}

export async function stopJwksServer(): Promise<void> {
  return new Promise((resolve) => {
    if (jwksServer) {
      jwksServer.close(() => resolve());
      jwksServer = null;
    } else {
      resolve();
    }
  });
}
