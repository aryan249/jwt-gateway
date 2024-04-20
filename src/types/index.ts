export interface ServiceConfig {
  name: string;
  prefix: string;
  upstream: string;
  roles: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  stripPrefix?: boolean;
}

export interface GatewayConfig {
  port: number;
  jwks: {
    uri: string;
    issuer: string;
    audience: string;
  };
  redis: {
    url: string;
  };
  sentry: {
    dsn: string;
  };
  rateLimitFailOpen: boolean;
  logLevel: string;
  services: ServiceConfig[];
}

export interface JwtPayload {
  sub: string;
  roles: string[];
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface CachedJwtResult {
  valid: boolean;
  payload: JwtPayload;
  cachedAt: number;
}
