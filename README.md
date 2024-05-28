# JWT Gateway

Production-grade API gateway middleware in TypeScript with JWT/JWKS validation, role-based access control, Redis caching, rate limiting, and Kubernetes deployment support.

## Architecture

```
                                    ┌─────────────────────────────────────────────────┐
                                    │              JWT Gateway (Express)               │
                                    │                                                 │
  ┌──────────┐   HTTP Request       │  ┌──────────────┐  ┌──────────────┐             │
  │          │ ──────────────────►  │  │ Correlation  │  │   Request    │             │
  │  Client  │                      │  │     ID       │─►│   Logger     │             │
  │          │ ◄──────────────────  │  └──────────────┘  └──────┬───────┘             │
  └──────────┘   HTTP Response      │                           │                     │
                                    │                    ┌──────▼───────┐              │
                                    │                    │    Rate      │◄──── Redis   │
                                    │                    │   Limiter    │    (sliding  │
                                    │                    └──────┬───────┘    window)   │
                                    │                           │                     │
                                    │                    ┌──────▼───────┐              │
                                    │                    │  JWT Auth    │◄──── Redis   │
                                    │                    │  (JWKS)      │    (cached   │
                                    │                    └──────┬───────┘   results)   │
                                    │                           │                     │
                                    │                    ┌──────▼───────┐              │
                                    │                    │    RBAC      │              │
                                    │                    │  (per-route) │              │
                                    │                    └──────┬───────┘              │
                                    │                           │                     │
                                    │            ┌──────────────┼──────────────┐       │
                                    │            │              │              │       │
                                    │     ┌──────▼─────┐ ┌─────▼──────┐ ┌─────▼────┐  │
                                    │     │   User     │ │  Billing   │ │ Analytics│  │
                                    │     │  Service   │ │  Service   │ │  Service │  │
                                    │     │  /api/users│ │ /api/billing│ │/api/analytics│
                                    │     └────────────┘ └────────────┘ └──────────┘  │
                                    └─────────────────────────────────────────────────┘
                                                         │
                                               ┌─────────▼──────────┐
                                               │    Sentry          │
                                               │  (errors, latency, │
                                               │   alerts)          │
                                               └────────────────────┘
```

### Request Flow

1. **Correlation ID** - Assigns or propagates `X-Request-ID` for distributed tracing
2. **Request Logger** - Logs method, URL, status, and duration with correlation ID via Winston
3. **Rate Limiter** - Redis-backed sliding window counter per client per service
4. **JWT Auth** - Validates Bearer token using JWKS endpoint, caches results in Redis
5. **RBAC** - Checks user roles against per-service allowed roles from config
6. **Proxy** - Forwards authenticated request to upstream backend service

## How JWKS Validation Works

The gateway uses asymmetric JWT verification with JSON Web Key Sets (JWKS):

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client   │         │  Gateway  │         │  Redis   │         │  Auth    │
│           │         │           │         │  Cache   │         │  Server  │
└─────┬─────┘         └─────┬─────┘         └─────┬────┘         └─────┬────┘
      │  Bearer <JWT>       │                     │                    │
      │────────────────────►│                     │                    │
      │                     │  GET jwt:<hash>     │                    │
      │                     │────────────────────►│                    │
      │                     │                     │                    │
      │                     │  Cache MISS         │                    │
      │                     │◄────────────────────│                    │
      │                     │                     │                    │
      │                     │  GET /.well-known/jwks.json              │
      │                     │────────────────────────────────────────►│
      │                     │                     │                    │
      │                     │  { keys: [{ kid, n, e, ... }] }         │
      │                     │◄────────────────────────────────────────│
      │                     │                     │                    │
      │                     │  jwt.verify(token, publicKey)            │
      │                     │  ✓ Valid                                 │
      │                     │                     │                    │
      │                     │  SET jwt:<hash> (TTL = exp - now)        │
      │                     │────────────────────►│                    │
      │                     │                     │                    │
      │  200 OK (proxied)   │                     │                    │
      │◄────────────────────│                     │                    │
```

**Key points:**
- The gateway never holds private keys -- it only fetches public keys from the JWKS endpoint
- `kid` (Key ID) in the JWT header maps to the correct public key, supporting key rotation
- Validation results are cached in Redis by `SHA-256(token)` with TTL matching token expiry
- All pods share the Redis cache, so a token validated on one pod is immediately cached for all
- The `jwks-rsa` library has built-in key caching and request rate limiting

## Setup

### Prerequisites

- Node.js >= 18
- Redis instance
- JWKS-compatible auth provider (Auth0, Keycloak, AWS Cognito, etc.)

### Local Development

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your values

# Run with Docker Compose (includes Redis)
docker compose up

# Or run directly (requires local Redis)
npm run dev
```

### Configuration

Backend services are configured in `src/config/routes.yaml`:

```yaml
services:
  - name: user-service
    prefix: /api/users
    upstream: http://user-service:3001
    roles: [admin, user]
    rateLimit:
      windowMs: 60000    # 1 minute window
      max: 100           # max requests per window
    stripPrefix: false
```

Each service defines:
- **prefix** - URL path prefix that routes to this service
- **upstream** - Backend service URL
- **roles** - JWT roles allowed to access this service
- **rateLimit** - Per-client sliding window rate limit

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWKS_URI` | JWKS endpoint URL | - |
| `JWT_ISSUER` | Expected JWT issuer | - |
| `JWT_AUDIENCE` | Expected JWT audience | - |
| `SENTRY_DSN` | Sentry DSN for error tracking | - |
| `RATE_LIMIT_FAIL_OPEN` | Allow traffic when Redis is down | `false` |
| `LOG_LEVEL` | Winston log level | `info` |

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires Redis)
npm run test:integration

# With coverage
npm run test:coverage
```

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/

# Verify PDB
kubectl get pdb jwt-gateway-pdb
```

The deployment includes:
- 3 replicas with resource limits
- Liveness probe on `/health`
- Readiness probe on `/ready`
- PodDisruptionBudget ensuring minimum 2 pods

## Design Decisions

### Why an API Gateway?

The gateway centralizes cross-cutting concerns (authentication, authorization, rate limiting, logging) into a single entry point. Without it, every backend service must independently implement JWT validation, RBAC, and rate limiting -- leading to inconsistent security policies, duplicated code, and operational complexity. The gateway acts as a policy enforcement point: services behind it can trust that requests are already authenticated and authorized.

### Why Redis Cache for JWT Validation?

JWT verification involves fetching public keys from the JWKS endpoint and performing RSA signature verification -- both are CPU and network-intensive operations. By caching validation results in Redis (keyed by SHA-256 of the token, with TTL matching the token's expiry), we:

1. **Eliminate redundant verification** across all gateway pods. A token validated on pod A is immediately cached for pods B and C.
2. **Reduce JWKS endpoint load.** Without caching, every request triggers a key lookup.
3. **Maintain security.** Cache entries expire when the token expires, and only a hash of the token is stored as the key (no PII in Redis).

The trade-off: if a token is revoked before expiry, the cached result will still consider it valid until the cache entry expires. For stricter revocation, integrate a token blacklist or reduce cache TTL.

### Why Pod Disruption Budget?

The PDB (`minAvailable: 2`) guarantees that Kubernetes will never voluntarily evict pods below 2 running instances during node drains, cluster upgrades, or scaling operations. This eliminates the single point of failure scenario:

- With 3 replicas and `minAvailable: 2`, at most 1 pod can be disrupted at a time
- Rolling updates proceed one pod at a time, maintaining availability
- Node maintenance can proceed without service downtime

Without a PDB, a cluster-wide upgrade could simultaneously terminate all gateway pods, causing a complete outage for all downstream services.

### Why Sliding Window Rate Limiting?

Fixed window counters allow burst traffic at window boundaries (e.g., 100 requests at 11:59:59 and 100 more at 12:00:00 = 200 requests in 2 seconds). The sliding window algorithm using Redis sorted sets provides accurate per-client rate limiting with no boundary burst issue. Each request is timestamped; expired entries are pruned on read.

## Project Structure

```
src/
├── index.ts              # Entry point with graceful shutdown
├── app.ts                # Express app factory (testable)
├── config/
│   ├── index.ts          # Config loader (env + YAML)
│   ├── routes.yaml       # Service routing rules
│   └── schema.ts         # Zod validation schema
├── middleware/
│   ├── correlationId.ts  # X-Request-ID propagation
│   ├── requestLogger.ts  # Winston request logging
│   ├── jwtAuth.ts        # JWT/JWKS validation + Redis cache
│   ├── rbac.ts           # Role-based access control
│   ├── rateLimiter.ts    # Redis sliding window rate limiter
│   └── errorHandler.ts   # Centralized error handling + Sentry
├── services/
│   ├── redis.ts          # ioredis client + health check
│   ├── sentry.ts         # Sentry initialization
│   ├── jwks.ts           # JWKS client + token verification
│   └── proxy.ts          # http-proxy-middleware wrapper
├── routes/
│   ├── health.ts         # /health and /ready endpoints
│   └── gateway.ts        # Dynamic route registration
├── types/
│   ├── index.ts          # Shared type definitions
│   └── express.d.ts      # Express Request augmentation
└── utils/
    ├── logger.ts         # Winston logger factory
    └── errors.ts         # Custom error classes
```

## Tech Stack

- **TypeScript** - Type safety across the entire codebase
- **Express** - HTTP server and middleware composition
- **ioredis** - Redis client for caching and rate limiting
- **jsonwebtoken + jwks-rsa** - JWT verification with JWKS
- **@sentry/node** - Error tracking and performance monitoring
- **Winston** - Structured logging with correlation IDs
- **Zod** - Runtime config validation
- **Jest + Supertest** - Unit and integration testing
- **Docker + Kubernetes** - Container deployment with PDB


<!-- Rate limiting docs -->
<!-- RBAC docs -->
