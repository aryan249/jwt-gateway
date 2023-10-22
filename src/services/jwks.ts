import jwksClient from 'jwks-rsa';

export const createJwksClient = (jwksUri: string) => {
  return jwksClient({ jwksUri, cache: true, rateLimit: true });
};
