# TicketsBot API

RESTful API service for the TicketsBot support ticket management system, built with [Hono](https://hono.dev/) framework and TypeScript.

## Overview

The TicketsBot API provides:

- 🎫 **Ticket Management** - Create, update, and manage support tickets
- 🔐 **Authentication** - Discord OAuth2 with Better Auth
- 👥 **Team Management** - Role-based permissions and team operations
- 📊 **Analytics** - Ticket statistics and insights
- 🎨 **Panel Management** - Create and deploy Discord ticket panels
- 📝 **Form Builder** - Dynamic forms for ticket creation

## Architecture

- **Framework**: Hono - Fast, lightweight web framework
- **Validation**: Zod schemas with `@hono/zod-validator`
- **Authentication**: Better Auth with Discord OAuth2
- **Context System**: AsyncLocalStorage for request-scoped data
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis (optional) for performance

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database
- Redis (optional, for caching)
- Discord application credentials

### Installation

```bash
# From monorepo root
pnpm install

# Navigate to API directory
cd apps/api

# Build the API
pnpm build
```

### Environment Setup

Create a `.env` file in the monorepo root:

```env
# Required
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/ticketsbot
BETTER_AUTH_SECRET=your-32-char-secret
API_URL=http://localhost:9001
WEB_URL=http://localhost:9000

# Discord OAuth
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URI=http://localhost:9001/auth/callback/discord

# Optional
REDIS_URL=redis://localhost:6379
API_PORT=9001
API_HOST=0.0.0.0
DEV_PERMISSIONS_HEX=0xfffffff  # Dev mode all permissions
```

### Development

```bash
# Start development server with hot reload
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## API Documentation

### Self-Documenting Schemas

The API provides live schema documentation:

```bash
# List all schemas
GET /schemas

# Get specific schema
GET /schemas/create-panel
```

### Authentication

All routes except public endpoints require authentication:

```typescript
// Auth cookie is automatically included
fetch("http://localhost:9001/tickets", {
  credentials: "include",
});
```

### Route Categories

#### Public Routes

- `GET /health` - Basic health check
- `GET /health/detailed` - Service status
- `GET|POST /auth/*` - Authentication endpoints
- `GET /schemas/*` - API schema documentation

#### Authenticated Routes

**Tickets** (`/tickets`)

- List, create, update, delete tickets
- Claim/unclaim assignment
- Close with reason
- View activity and messages

**Panels** (`/panels`)

- CRUD operations for ticket panels
- Deploy to Discord channels
- Multi-panel support

**Guild Management** (`/guilds/:guildId`)

- Guild settings and configuration
- Team member management
- Role assignments

**Discord Integration** (`/discord`)

- List user's guilds
- Get channels and roles
- Member search

**Forms** (`/forms`)

- Create dynamic forms
- Field validation rules
- Form templates

**User** (`/user`)

- Profile information
- Preferences management

## Key Features

### Context System

The API uses AsyncLocalStorage for request context:

```typescript
// Middleware automatically provides context
app.use("*", contextMiddleware);

// Access in routes
const actor = Actor.use();
const permissions = actor.properties.permissions;
```

### Permission System

Granular permission checking:

```typescript
app.get("/admin-route", requirePermission(PermissionFlags.GUILD_SETTINGS_EDIT), async (c) => {
  // User has required permission
});
```

### Schema Validation

Type-safe request validation:

```typescript
app.post("/tickets", zValidator("json", CreateTicketSchema), async (c) => {
  const data = c.req.valid("json"); // Type-safe
});
```

### Health Monitoring

Comprehensive health checks:

```json
GET /health/detailed

{
  "status": "healthy",
  "services": {
    "database": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "latency": 1 },
    "auth": { "status": "healthy", "redisEnabled": true }
  }
}
```

## Development Guide

### Adding New Routes

1. Create route file in `src/routes/`
2. Define Zod schemas for validation
3. Use domain methods for business logic
4. Export and mount in `index.ts`

Example:

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const myRoute = new Hono();

const CreateSchema = z.object({
  name: z.string().min(1),
});

myRoute.post("/", requireAuth, zValidator("json", CreateSchema), async (c) => {
  const data = c.req.valid("json");
  // Use domain methods
  const result = await MyDomain.create(data);
  return c.json(result);
});
```

### Error Handling

Centralized error handler converts domain errors:

- `VisibleError` → 400 Bad Request
- `PermissionDeniedError` → 403 Forbidden
- `NotFoundError` → 404 Not Found
- Unexpected errors → 500 Internal Server Error

### Testing

Write tests using Vitest:

```typescript
import { describe, it, expect } from "vitest";
import { app } from "../src/index";

describe("Tickets API", () => {
  it("should list tickets", async () => {
    const res = await app.request("/tickets");
    expect(res.status).toBe(200);
  });
});
```

## Deployment

### Docker

Build and run with Docker:

```bash
# Build image
docker build -f apps/api/Dockerfile -t ticketsbot-api .

# Run container
docker run -d \
  --name ticketsbot-api \
  -p 9001:9001 \
  --env-file .env \
  ticketsbot-api
```

### Production Checklist

1. Set `NODE_ENV=production`
2. Configure Redis for caching
3. Enable rate limiting
4. Set strong `BETTER_AUTH_SECRET`
5. Configure proper CORS origins
6. Monitor health endpoints
7. Set up logging aggregation

## Troubleshooting

### Common Issues

**CORS Errors**

- Ensure `WEB_URL` matches your frontend URL
- Check credentials are included in requests

**Permission Denied**

- Verify user has required permissions in database
- Check `DEV_PERMISSIONS_HEX` in development

**Database Connection**

- Verify `DATABASE_URL` is correct
- Ensure migrations are run: `pnpm db:migrate`

**Redis Connection**

- Redis is optional; API works without it
- Check `REDIS_URL` if caching needed

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
```

## API Design Principles

1. **RESTful conventions** - Standard HTTP methods and status codes
2. **Type safety** - Zod validation for all inputs
3. **Context-aware** - No prop drilling for auth/permissions
4. **Domain-driven** - Business logic in core package
5. **Self-documenting** - Live schema endpoint
6. **Graceful degradation** - Works without optional services

## Contributing

1. Follow existing patterns and conventions
2. Add tests for new endpoints
3. Update schema documentation
4. Ensure type safety throughout
5. Handle errors appropriately

## Resources

- [Hono Documentation](https://hono.dev/)
- [Better Auth Docs](https://www.better-auth.com/)
- [Zod Documentation](https://zod.dev/)
- [TicketsBot Core](../packages/core/README.md)
