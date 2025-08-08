# TicketsBot API

Hono-based REST API for TicketsBot, providing ticket management, authentication, and Discord integration.

## Tech Stack

- **Framework**: Hono with TypeScript
- **Auth**: Better Auth + Discord OAuth2
- **Database**: PostgreSQL + Prisma
- **Validation**: Zod schemas
- **Context**: AsyncLocalStorage for request-scoped data

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm dev

# Available commands
pnpm typecheck   # Type checking
pnpm lint        # Linting
```

### Environment Variables

```env
# Required
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/ticketsbot
BETTER_AUTH_SECRET=your-32-char-secret
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000

# Discord OAuth
NEXT_PUBLIC_DISCORD_CLIENT_ID=your-client-id
NEXT_PUBLIC_DISCORD_CLIENT_SECRET=your-client-secret

# Optional
REDIS_URL=redis://localhost:6379
PORT=3001  # API port (default: 3001)
API_HOST=0.0.0.0
```

## API Routes

### Public
- `GET /health` - Health check
- `GET /health/detailed` - Service status
- `GET|POST /auth/*` - Authentication

### Authenticated

| Route | Purpose |
|-------|------|
| `/tickets` | List, create, update, claim, close tickets |
| `/panels` | Manage and deploy ticket panels |
| `/guilds/:guildId` | Guild settings and team management |
| `/discord` | Guild/channel/role listings |
| `/forms` | Dynamic form builder |
| `/user` | User profile and preferences |
| `/permissions` | Permission checks |

## Key Features

- **Context System**: AsyncLocalStorage provides auth/guild context to all routes
- **Permission Middleware**: Granular permission checking via `requirePermission()`
- **Type Safety**: Zod validation on all inputs
- **Health Monitoring**: Database and Redis status at `/health/detailed`
- **Error Handling**: Centralized error handler with proper HTTP status codes

## Development

### Adding Routes

1. Create route file in `src/routes/`
2. Define Zod schemas for validation  
3. Use domain methods from `@ticketsbot/core/domains`
4. Mount in `index.ts`

### Error Handling

Domain errors automatically map to HTTP status:
- `VisibleError` → 400
- `PermissionDeniedError` → 403
- `NotFoundError` → 404
- Unexpected → 500

## Production

### Deployment Checklist

- Set `NODE_ENV=production`
- Configure Redis for caching (optional)
- Set strong `BETTER_AUTH_SECRET` (32+ chars)
- Configure CORS origins in `WEB_URL`
- Monitor `/health/detailed` endpoint

### Troubleshooting

- **CORS**: Ensure `WEB_URL` matches frontend
- **Permissions**: Check database roles or context middleware
- **Database**: Verify `DATABASE_URL` and run migrations
- **Redis**: Optional - API works without it

## Architecture Notes

- RESTful conventions with standard HTTP status codes
- Type-safe with Zod validation on all inputs
- Context-aware via AsyncLocalStorage (no prop drilling)
- Business logic in `@ticketsbot/core/domains`
- Graceful degradation without optional services (Redis)
