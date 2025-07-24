# API Application

## Architecture

The API uses Hono framework with:

- **Context-aware architecture** using AsyncLocalStorage
- **Domain-driven design** with all business logic in `@ticketsbot/core/domains`
- **Zod validation** with `@hono/zod-validator` for type-safe requests
- **Centralized error handling** for consistent error responses
- **Schema documentation** endpoint for API discovery

### Context System

The API uses Hono middleware to provide context throughout the request lifecycle:

```typescript
// Automatic context propagation
app.use("*", contextMiddleware);

// Routes automatically have access to:
- User authentication (from Better Auth)
- Guild context
- Permissions
- Request ID for tracing
```

### Middleware Stack

1. **CORS Middleware**
   - Configured for web app origin
   - Credentials enabled for auth cookies

2. **Context Middleware** (`middleware/context.ts`)
   - Creates actor context from auth session
   - Extracts guild ID from params, query, or body
   - Supports dev permission overrides via `DEV_PERMISSIONS_HEX`
   - Provides `web_user` actor type with permissions

3. **Permission Middleware**
   - `requireAuth` - Basic authentication check
   - `requirePermission(flag)` - Specific permission requirement
   - `requireAnyPermission(...flags)` - Any of multiple permissions

4. **Rate Limiting** (currently disabled)
   - Per-user and per-endpoint limits

### Domain Integration

All routes use domain methods from `@ticketsbot/core/domains`:

```typescript
// Domain methods automatically use context
const tickets = await Ticket.listForGuild(); // Guild from context
const panel = await Panel.create(data); // User permissions checked via context
```

## Key Patterns

### Route Structure

```typescript
app.get("/tickets", async (c) => {
  // Context automatically available
  const tickets = await Ticket.listForGuild({
    status: c.req.query("status"),
    limit: parseInt(c.req.query("limit") || "50"),
  });

  return c.json(tickets);
});
```

### Error Handling

Centralized error handler converts domain errors to HTTP responses:

- `VisibleError` → 400 with message
- `PermissionDeniedError` → 403
- `NotFoundError` → 404
- Unexpected errors → 500 with generic message

### Validation

Using Zod v4 with Hono's `zValidator` middleware:

```typescript
import { zValidator } from "@hono/zod-validator";

// Define schema
const UpdateSettingsSchema = z.object({
  maxTicketsPerUser: z.number().min(0).max(50).optional(),
  supportRoles: z.array(z.string()).optional(),
});

// Use in route with automatic validation
app.put("/settings", zValidator("json", UpdateSettingsSchema), async (c) => {
  const data = c.req.valid("json"); // Type-safe, validated data
  // ...
});
```

## Testing

### Vitest Test Suite

Comprehensive unit and integration tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test tickets.test.ts
```

### Test Categories

- **Unit Tests**: Error handling, validation, utilities
- **Route Tests**: Individual route behavior
- **Integration Tests**: Schema compatibility, end-to-end flows

### Test Token Generation

```bash
# Generate auth token for testing (from monorepo root)
pnpm test:token
```

## Routes

### Public Routes (No Auth Required)

- `GET /health` - Health check endpoint
- `GET|POST /auth/*` - Authentication endpoints (Better Auth)
- `GET /schemas` - List all API schemas
- `GET /schemas/:name` - Get specific schema documentation

### Authenticated Routes

#### Discord Integration

- `GET /discord/guilds` - List user's Discord guilds
- `GET /discord/guilds/:guildId/channels` - List guild channels
- `GET /discord/guilds/:guildId/roles` - List guild roles
- `GET /discord/guilds/:guildId/members` - Search guild members

#### Ticket Management

- `GET /tickets` - List tickets with filtering
- `POST /tickets` - Create new ticket
- `GET /tickets/:id` - Get ticket details
- `PUT /tickets/:id` - Update ticket
- `DELETE /tickets/:id` - Delete ticket
- `GET /tickets/:id/activity` - Get ticket activity log
- `GET /tickets/:id/messages` - Get ticket messages
- `POST /tickets/:id/claim` - Claim ticket
- `POST /tickets/:id/unclaim` - Unclaim ticket
- `POST /tickets/:id/close` - Close ticket

#### Panel Management

- `GET /panels` - List panels
- `POST /panels` - Create panel
- `GET /panels/:id` - Get panel details
- `PUT /panels/:id` - Update panel
- `DELETE /panels/:id` - Delete panel
- `POST /panels/:id/deploy` - Deploy panel to Discord

#### Guild Settings

- `GET /guilds/:guildId` - Get guild info
- `GET /guilds/:guildId/settings` - Get settings
- `PUT /guilds/:guildId/settings` - Update settings
- `GET /guilds/:guildId/team` - List team members
- `POST /guilds/:guildId/team` - Add team member
- `DELETE /guilds/:guildId/team/:userId` - Remove team member

#### Forms

- `GET /forms` - List forms
- `POST /forms` - Create form
- `GET /forms/:id` - Get form details
- `PUT /forms/:id` - Update form
- `DELETE /forms/:id` - Delete form

#### User

- `GET /user` - Get current user info
- `GET /user/preferences` - Get user preferences
- `PUT /user/preferences` - Update preferences

## Development

### Running

```bash
# Development with hot reload
pnpm dev

# Production
pnpm build && pnpm start
```

### Adding New Routes

1. Create route file in `routes/`
2. Use domain methods for business logic
3. Add validation schemas
4. Write Hurl tests
5. Register in `index.ts`

### Context Usage

```typescript
// Context is automatically provided by middleware
import { Actor } from "@ticketsbot/core/context";

// In route handler:
app.get("/example", requireAuth, async (c) => {
  // Access current actor
  const actor = Actor.use();

  // Check permissions
  if (Actor.hasPermission(PermissionFlags.TICKET_VIEW_ALL)) {
    // User has permission
  }

  // Domain methods automatically use context
  const tickets = await Ticket.listForGuild();

  // Guild ID extracted from request automatically
  const guildId = actor.properties.selectedGuildId;
});

// Transaction with context
await withTransaction(async () => {
  // All operations share same transaction and context
});
```

## Environment Variables

### Required

- `NODE_ENV` - Environment (development/staging/production)
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Authentication secret key
- `API_URL` - Public API URL (e.g., http://localhost:9001)
- `WEB_URL` - Web app URL for CORS (e.g., http://localhost:9000)
- `API_PORT` - Port to run API server (default: 9001)
- `API_HOST` - Host to bind to (default: localhost)

### Discord OAuth

- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application secret

### Optional

- `REDIS_URL` - Redis connection for caching/sessions
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `DEV_PERMISSIONS_HEX` - Override permissions in development (e.g., 0xfffffff)
- `RUNNING_IN_DOCKER` - Set to "true" when running in Docker

## Development Features

### Permission Overrides

In development, you can override user permissions:

```env
DEV_PERMISSIONS_HEX=0xfffffff  # All permissions
```

This grants the specified permissions regardless of actual database values.

### Request Logging

All requests are logged with method, path, and origin for debugging.

## Schema Documentation

The API provides self-documenting schemas at `/schemas`:

```bash
# List all schemas
curl http://localhost:9001/schemas

# Get specific schema
curl http://localhost:9001/schemas/create-panel
```

Schemas include JSON Schema definitions and examples for all API endpoints.
