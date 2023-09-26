import path from 'path';
import { loadConfig } from '../../../src/config';

describe('config loader', () => {
  it('loads and validates the default routes.yaml', () => {
    const routesPath = path.resolve(__dirname, '../../../src/config/routes.yaml');
    const config = loadConfig(routesPath);

    expect(config.services).toHaveLength(3);
    expect(config.services[0].name).toBe('user-service');
    expect(config.services[0].roles).toContain('admin');
    expect(config.services[0].rateLimit.max).toBe(100);
  });

  it('throws on invalid YAML path', () => {
    expect(() => loadConfig('/nonexistent/path.yaml')).toThrow();
  });

  it('uses environment variables for non-route config', () => {
    const original = process.env.PORT;
    process.env.PORT = '8080';

    const routesPath = path.resolve(__dirname, '../../../src/config/routes.yaml');
    const config = loadConfig(routesPath);

    expect(config.port).toBe(8080);

    process.env.PORT = original;
  });
});
