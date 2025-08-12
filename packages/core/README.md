# @ticketsbot/core

The foundational package for TicketsBot, providing shared schemas, domain logic, authentication, and database access across the monorepo.

## Overview

`@ticketsbot/core` consolidates all core functionality needed by the API, bot, and web applications:

- **Domain Namespaces** - Business logic organized by domain (User, Guild, Ticket, etc.)
- **Context System** - AsyncLocalStorage-based request context
- **Authentication** - Better-auth integration with Discord OAuth
- **Database Layer** - Prisma client and schema management
- **Validation** - Zod schemas for type-safe validation
- **Utilities** - Common helpers for permissions, Discord IDs, etc.

## Architecture

### Domain-Driven Design

The package uses a domain namespace pattern to organize business logic:

```typescript
// Each domain exports schemas and context-aware methods
import { Ticket, type TicketCore } from "@ticketsbot/core/domains/ticket";

// Use domain methods with automatic context
const ticket = await Ticket.getById(123);
await Ticket.update(123, { status: "closed" });
```

### Context System

AsyncLocalStorage provides request-scoped context without prop drilling:

```typescript
// Server-only import (Node.js APIs)
import { Actor, withTransaction } from "@ticketsbot/core/context";

// Context automatically available in domain methods
const ticket = await Ticket.create(data); // Uses current Actor for permissions
```

### Permission System

BigInt-based permission flags with 28 different permissions:

```typescript
import { PermissionFlags, PermissionUtils } from "@ticketsbot/core";

// Check permissions
const hasAccess = PermissionUtils.has(userPerms, PermissionFlags.TICKET_VIEW_ALL);

// Combine permissions
const adminPerms = PermissionUtils.combine([
  PermissionFlags.PANEL_CREATE,
  PermissionFlags.PANEL_EDIT,
  PermissionFlags.PANEL_DELETE,
]);
```

## Module Structure

### `/domains` - Business Logic Namespaces

11 domain namespaces following consistent patterns:

- **Core Entities**: `user`, `guild`, `ticket`, `panel`
- **Supporting**: `team`, `event`, `tag`, `form`
- **System**: `scheduled-task`, `ticket-lifecycle`, `analytics`, `transcripts`

Each domain contains:

- `index.ts` - Public exports
- `index.context.ts` - Context-aware methods
- `schemas.ts` - Zod validation schemas
- `static.ts` - Methods without context requirements

### `/auth` - Authentication System

Better-auth integration with services:

- `auth.ts` - Core auth configuration
- `services/discord-link.ts` - Discord account linking
- `services/permissions.ts` - Permission utilities
- `services/session.ts` - Session management
- `services/redis.ts` - Redis service for sessions

### `/context` - Request Context

AsyncLocalStorage-based context system:

- `actor.ts` - Actor types (Discord, Web, System)
- `transaction.ts` - Transaction management
- `middleware/` - Framework integrations (Hono, Next.js)

### `/prisma` - Database Layer

- `client.ts` - Singleton Prisma client
- `schema.prisma` - Main schema file
- `*.prisma` - Split schema files by domain
- `services/cache.ts` - In-memory caching
- `services/validation.ts` - Validation utilities

### `/schemas` - Common Schemas

- `common.ts` - Shared validation schemas
- `permissions.ts` - Permission schemas
- `permissions-constants.ts` - Permission flag definitions

### `/utils` - Utilities

- `permissions.ts` - Permission flag operations
- `discord-id.ts` - Discord ID parsing/validation
- `logger.ts` - Logging utilities

## Domain Pattern

Each domain follows this structure:

```typescript
// schemas.ts - Validation schemas
export const CreateTicketSchema = z.object({
  panelId: z.number(),
  openerId: DiscordIdSchema,
  subject: z.string().optional(),
});

// static.ts - Methods without context
export const findByChannelId = async (channelId: string) => {
  return prisma.ticket.findFirst({
    where: { channelId },
  });
};

// index.context.ts - Context-aware methods
export namespace Ticket {
  export const create = async (input: CreateTicketInput) => {
    const actor = Actor.use();
    actor.requirePermission(PermissionFlags.TICKET_CREATE);

    return withTransaction(async () => {
      const ticket = await prisma.ticket.create({ data: input });

      afterTransaction(async () => {
        await Event.create({
          type: "ticket.created",
          ticketId: ticket.id,
        });
      });

      return ticket;
    });
  };
}
```

## Context System Usage

### Actor Context

Three actor types for different contexts:

```typescript
// Discord bot command
Actor.provide(
  new DiscordActor({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    permissions: member.permissions,
  }),
  async () => {
    await Ticket.create(data);
  }
);

// Web API request
Actor.provide(
  new WebActor({
    userId: session.user.id,
    email: session.user.email,
    selectedGuildId: req.headers["x-guild-id"],
  }),
  async () => {
    await Panel.update(panelId, updates);
  }
);

// System/background job
Actor.provide(new SystemActor(), async () => {
  await ScheduledTask.processAutoClose();
});
```

### Transaction Management

Automatic transaction handling with side effects:

```typescript
const result = await withTransaction(async () => {
  // All DB operations are transactional
  const ticket = await Ticket.create(data);
  await Team.assignToTicket(ticket.id, userId);

  // Schedule after commit
  afterTransaction(async () => {
    await sendDiscordNotification(ticket);
    await Analytics.track("ticket.created", ticket);
  });

  return ticket;
});
```

## Common Patterns

### Ensure Methods

Create if not exists:

```typescript
const user = await ensureDiscordUser(discordId, userData);
const guild = await Guild.ensure(guildId);
```

### Permission Checks

```typescript
// In domain methods
Actor.requirePermission(PermissionFlags.PANEL_EDIT);

// Manual checks
if (!Actor.hasPermission(PermissionFlags.TICKET_VIEW_ALL)) {
  throw new PermissionDeniedError();
}
```

### Unchecked Methods

For internal use without permission checks:

```typescript
// Public API - checks permissions
const ticket = await Ticket.getById(123);

// Internal use - no permission check
const ticket = await getByIdUnchecked(123);
```

### API Formatting

Transform DB models for API responses:

```typescript
const formatted = Panel.formatForApi(panel);
// Converts BigInt to strings, formats dates, etc.
```

## Development Features

### Auto-Seeding

```env
DEV_DB_AUTO_SEED=true  # Seeds DB on startup
```

### Permission Override

```env
DEV_PERMISSIONS_HEX=0xfffffff  # Grant all permissions in dev
```

### Logging

All modules use structured logging:

```typescript
logger.info("Creating ticket", {
  userId: actor.userId(),
  panelId: input.panelId,
});
```

## Import Guidelines

### Server-Only Imports

Context system requires Node.js APIs:

```typescript
// ✅ Correct - Subpath import
import { Actor, withTransaction } from "@ticketsbot/core/context";

// ❌ Wrong - Would break client builds
import { Actor } from "@ticketsbot/core";
```

### Client-Safe Imports

Schemas and types are safe for client use:

```typescript
// ✅ Safe for client and server
import { TicketStatus, DiscordIdSchema } from "@ticketsbot/core";
import { PermissionFlags, PermissionUtils } from "@ticketsbot/core";
```

## Testing

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck
```

## Key Dependencies

- **@prisma/client** - Database ORM
- **zod** - Schema validation
- **better-auth** - Authentication
- **bullmq** - Job queues (scheduled-task domain)
- **@sapphire/bitfield** - Permission flag operations

## Best Practices

1. **Always use domain methods** instead of direct Prisma access
2. **Import from subpaths** for server-only modules
3. **Use transactions** for multi-step operations
4. **Schedule side effects** with afterTransaction
5. **Check permissions** using Actor.requirePermission
6. **Validate inputs** with Zod schemas
7. **Log significant actions** for debugging

## Examples

### Creating a Support Ticket

```typescript
import { Actor } from "@ticketsbot/core/context";
import { Ticket, Panel } from "@ticketsbot/core/domains";

// In API route handler
const ticket = await Actor.provideAsync(webActor, async () => {
  // Get panel with validation
  const panel = await Panel.getById(input.panelId);

  // Create ticket - permissions checked automatically
  return await Ticket.create({
    panelId: panel.id,
    openerId: session.user.discordId,
    subject: input.subject,
  });
});
```

### Background Job Processing

```typescript
import { Actor } from "@ticketsbot/core/context";
import { ScheduledTask } from "@ticketsbot/core/domains";

// In worker process
await Actor.provideAsync(new SystemActor(), async () => {
  await ScheduledTask.processAutoCloseJobs();
});
```

## Contributing

When adding new features:

1. Follow the domain pattern for new business logic
2. Add Zod schemas for all inputs/outputs
3. Use the context system for auth/transactions
4. Document complex business rules
5. Add tests for critical paths
