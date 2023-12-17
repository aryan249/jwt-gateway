import { z } from 'zod';

export const serviceSchema = z.object({
  name: z.string().min(1),
  prefix: z.string().startsWith('/'),
  upstream: z.string().url(),
  roles: z.array(z.string()).min(1),
  rateLimit: z.object({
    windowMs: z.number().positive(),
    max: z.number().positive(),
  }),
  stripPrefix: z.boolean().optional().default(false),
});

export const routesConfigSchema = z.object({
  services: z.array(serviceSchema).min(1).refine(
    (services) => {
      const prefixes = services.map((s) => s.prefix);
      return new Set(prefixes).size === prefixes.length;
    },
    { message: 'Service prefixes must be unique' },
  ),
});

export type RoutesConfig = z.infer<typeof routesConfigSchema>;
// Fix: validate nested route objects
