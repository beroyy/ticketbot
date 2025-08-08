# API Application Context

## Architecture Overview

- **Framework**: Hono with AsyncLocalStorage context system
- **Business Logic**: Domain-driven via `@ticketsbot/core/domains`
- **Validation**: Zod with `@hono/zod-validator`
- **Zod v4**: See `docs/zod-v4.md` for breaking changes and new patterns
- **Error Handling**: Centralized handler maps domain errors to HTTP

## Middleware Stack

1. **CORS**: Configured for web app origin with credentials
2. **Context** (`middleware/context.ts`): Creates actor context from auth session, extracts guild ID
3. **Permissions**: `requireAuth`, `requirePermission(flag)`, `requireAnyPermission(...flags)`

## Domain Integration Pattern

```typescript
// Context automatically available to domain methods
const tickets = await Ticket.listForGuild(); // Uses guild from context
const panel = await Panel.create(data); // Checks permissions via context
```

## Key Implementation Patterns

### Route + Validation

```typescript
app.put("/settings", zValidator("json", UpdateSettingsSchema), async (c) => {
  const data = c.req.valid("json"); // Type-safe
  return c.json(await Settings.update(data));
});
```

### Error Mapping

- `VisibleError` → 400
- `PermissionDeniedError` → 403
- `NotFoundError` → 404
- Unexpected → 500

## Route Structure

See README.md for route listing. Key patterns:

- Public routes: `/health`, `/auth/*`
- Authenticated routes require context middleware
- Guild-scoped routes extract guild ID from params/query
- All routes use domain methods for business logic

## Development Notes

### Context Usage

```typescript
// Actor context automatically available in routes
const actor = Actor.use();
const guildId = actor.properties.selectedGuildId;

// Permission checks
if (Actor.hasPermission(PermissionFlags.TICKET_VIEW_ALL)) {
  // Has permission
}

// Transactions preserve context
await withTransaction(async () => {
  // Operations share transaction + context
});
```

## Environment Variables

See README.md for required environment variables.

Key differences from other apps:

- Uses `PORT` (not `API_PORT`)
- Default port is 3001 (not 9001)
- Discord vars use `NEXT_PUBLIC_` prefix

## Important Implementation Details

- **No rate limiting** currently implemented
- **No test suite** currently configured
- **Redis optional** - API works without it
- **Context extraction** from params > query > body
- **Request logging** enabled with origin tracking
