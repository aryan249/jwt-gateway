import * as jwksService from '../../../src/services/jwks';
import * as redisService from '../../../src/services/redis';
import { AuthenticationError } from '../../../src/utils/errors';

jest.mock('../../../src/services/redis');

describe('jwks service', () => {
  const mockGetRedisClient = redisService.getRedisClient as jest.MockedFunction<
    typeof redisService.getRedisClient
  >;

  beforeEach(() => {
    mockGetRedisClient.mockReturnValue(null);
  });

  it('throws when JWKS client is not initialized', async () => {
    await expect(
      jwksService.verifyToken('some-token', 'issuer', 'audience'),
    ).rejects.toThrow(AuthenticationError);
  });

  it('throws on invalid token format', async () => {
    jwksService.initJwksClient('https://example.com/.well-known/jwks.json');

    await expect(
      jwksService.verifyToken('not-a-jwt', 'issuer', 'audience'),
    ).rejects.toThrow(AuthenticationError);
  });
});
