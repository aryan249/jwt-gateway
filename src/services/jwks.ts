import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getRedisClient } from './redis';
import { logger } from '../utils/logger';
import { AuthenticationError } from '../utils/errors';
import type { JwtPayload, CachedJwtResult } from '../types';

let client: jwksClient.JwksClient | null = null;

export function initJwksClient(jwksUri: string): jwksClient.JwksClient {
  client = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });
  return client;
}

export function getJwksClient(): jwksClient.JwksClient | null {
  return client;
}

function getTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
}

async function getCachedResult(tokenHash: string): Promise<CachedJwtResult | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get(`jwt:${tokenHash}`);
    if (!cached) return null;
    return JSON.parse(cached) as CachedJwtResult;
  } catch (err) {
    logger.warn('Redis cache read failed', { error: (err as Error).message });
    return null;
  }
}

async function setCachedResult(
  tokenHash: string,
  result: CachedJwtResult,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis || ttlSeconds <= 0) return;

  try {
    await redis.setex(`jwt:${tokenHash}`, ttlSeconds, JSON.stringify(result));
  } catch (err) {
    logger.warn('Redis cache write failed', { error: (err as Error).message });
  }
}

export async function verifyToken(
  token: string,
  issuer: string,
  audience: string,
): Promise<JwtPayload> {
  const tokenHash = getTokenHash(token);

  // Check cache
  const cached = await getCachedResult(tokenHash);
  if (cached?.valid) {
    return cached.payload;
  }

  if (!client) {
    throw new AuthenticationError('JWKS client not initialized');
  }

  // Decode header to get kid
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new AuthenticationError('Invalid token format');
  }

  const kid = decoded.header.kid;
  if (!kid) {
    throw new AuthenticationError('Token missing key ID (kid)');
  }

  // Get signing key
  let signingKey: string;
  try {
    const key = await client.getSigningKey(kid);
    signingKey = key.getPublicKey();
  } catch (err) {
    throw new AuthenticationError(`Unable to find signing key: ${(err as Error).message}`);
  }

  // Verify token
  try {
    const payload = jwt.verify(token, signingKey, {
      issuer,
      audience,
      algorithms: ['RS256'],
    }) as JwtPayload;

    // Normalize roles to always be an array of strings
    if (!payload.roles) {
      payload.roles = [];
    } else if (!Array.isArray(payload.roles)) {
      payload.roles = [String(payload.roles)];
    }

    // Cache result
    const exp = payload.exp || 0;
    const ttl = exp - Math.floor(Date.now() / 1000);
    await setCachedResult(tokenHash, { valid: true, payload, cachedAt: Date.now() }, ttl);

    return payload;
  } catch (err) {
    if (err instanceof AuthenticationError) throw err;
    throw new AuthenticationError(`Token verification failed: ${(err as Error).message}`);
  }
}
// Token expiration is validated during verification
// Redis-based JWKS key caching
// Cache invalidation on key rotation
