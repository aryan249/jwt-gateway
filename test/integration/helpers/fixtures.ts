import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Generate RSA key pair for testing
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const KID = 'test-key-id-1';

// Convert PEM public key to JWK format
function pemToJwk(pem: string) {
  const keyObject = crypto.createPublicKey(pem);
  const jwk = keyObject.export({ format: 'jwk' });
  return { ...jwk, kid: KID, use: 'sig', alg: 'RS256' };
}

export const testJwk = pemToJwk(publicKey);

export const jwksResponse = {
  keys: [testJwk],
};

export const TEST_ISSUER = 'https://test-auth.example.com/';
export const TEST_AUDIENCE = 'test-api';

export function createTestToken(
  payload: Record<string, unknown> = {},
  options: { expiresIn?: string; kid?: string } = {},
): string {
  const defaultPayload = {
    sub: 'user-123',
    roles: ['user'],
    ...payload,
  };

  return jwt.sign(defaultPayload, privateKey, {
    algorithm: 'RS256',
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    expiresIn: options.expiresIn || '1h',
    keyid: options.kid || KID,
  } as jwt.SignOptions);
}

export function createExpiredToken(payload: Record<string, unknown> = {}): string {
  const defaultPayload = {
    sub: 'user-123',
    roles: ['user'],
    ...payload,
  };

  return jwt.sign(defaultPayload, privateKey, {
    algorithm: 'RS256',
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    expiresIn: '-1h',
    keyid: KID,
  } as jwt.SignOptions);
}

export { publicKey, privateKey, KID };
