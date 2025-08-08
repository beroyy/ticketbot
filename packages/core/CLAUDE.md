# @ticketsbot/core Context

## Purpose

Core schemas, utilities, and shared functionality for TicketsBot. This package consolidates database access, authentication, domain logic, analytics, and validation into a single foundational layer.

## Package Structure

```
core/
├── prisma/              # Database layer with split schemas
│   ├── client.ts       # Prisma client singleton
│   ├── schema.prisma   # Main schema file
│   ├── *.prisma        # Domain-specific schema files
│   └── services/       # Database services
│       └── validation.ts # Zod validation utilities
├── domains/            # 13 Domain namespaces
│   ├── account/       # Account management
│   ├── analytics/     # Analytics tracking domain
│   ├── event/         # Event logging domain
│   ├── form/          # Form field management
│   ├── guild/         # Guild/server configuration
│   ├── panel/         # Support panel management
│   ├── scheduled-task/# BullMQ job scheduling
│   ├── tag/           # Tag system
│   ├── team/          # Team & permissions
│   ├── ticket/        # Core ticket operations
│   ├── ticket-lifecycle/# Ticket lifecycle management
│   ├── transcripts/   # Message transcripts
│   └── user/          # Discord user management
├── analytics/         # Analytics integration
│   ├── posthog/       # PostHog client & tracking
│   ├── logger/        # Structured logging
│   └── metrics/       # Performance metrics
├── auth/              # Authentication system
│   ├── auth.ts        # Better-auth configuration
│   ├── services/      # Auth services
│   │   ├── discord-api.ts    # Discord API client
│   │   ├── discord-link.ts   # Account linking
│   │   ├── permissions.ts    # Permission utilities
│   │   ├── redis.ts         # Redis service
│   │   └── session.ts       # Session management
│   └── types.ts       # Auth type definitions
├── context/           # AsyncLocalStorage context system
│   ├── actor.ts       # Actor types (Discord/Web/System)
│   ├── transaction.ts # Transaction management
│   ├── monitoring.ts  # Context monitoring
│   ├── errors.ts      # Context error types
│   └── middleware/    # Framework integrations
│       ├── hono.ts    # Hono middleware
│       └── nextjs.ts  # Next.js middleware
├── discord/           # Discord-specific utilities
│   └── ticket-operations.ts # Ticket channel operations
├── redis/             # Redis connection utilities
│   └── index.ts       # Redis availability checks
├── schemas/           # Common Zod schemas
│   ├── common.ts      # Shared validation schemas
│   ├── permissions.ts # Permission schemas
│   └── permissions-constants.ts # Permission flags
└── utils/             # Core utilities
    ├── discord-id.ts  # Discord ID parsing
    ├── logger.ts      # Logging utilities
    └── permissions.ts # Permission flag operations
```

## Key Components

### Schemas

- **Entity schemas** - Ticket, Panel, Form, Tag, etc.
- **Discord schemas** - Guild, User, Channel validations
- **Auth schemas** - Session, token validations
- **API schemas** - Request/response validations

### Analytics

- **PostHog Integration** - Event tracking and user identification
- **Logger** - Structured logging with levels and context
- **Metrics** - Performance tracking and monitoring
- **Context-aware tracking** - Automatic actor context inclusion

### Authentication

- **Better-auth** - Discord OAuth integration
- **Session Management** - Redis-backed sessions
- **Discord Account Linking** - Link Discord accounts to users
- **Permission Service** - Auth-specific permission utilities

### Utilities

- **PermissionUtils** - BigInt permission flag operations
- **parseDiscordId** - Convert Discord snowflakes to strings
- **Direct Redis usage** - Permissions caching without abstraction layers
- **ValidationService** - Zod validation with error formatting

### Constants

- **PermissionFlags** - All permission BigInt constants
- **DefaultRolePermissions** - Default role permission sets

### Redis Integration

- **Redis Service** - Managed Redis connections
- **Session Storage** - Persistent session management
- **Job Queues** - BullMQ backend for scheduled tasks

## Architectural Philosophy: Avoid Over-Engineering

### Keep It Simple and Explicit

This codebase prioritizes **explicit, straightforward code** over clever abstractions. With a small team (max 2 developers), we optimize for clarity and maintainability.

#### Anti-Patterns to Avoid

1. **Hidden Transaction Coupling** (e.g., `useTransaction()`)
   - ❌ Don't: Create functions that magically participate in transactions
   - ✅ Do: Explicitly pass transaction clients when needed
   - ✅ Do: Use `prisma.$transaction()` at the operation boundaries

2. **Unnecessary Abstraction Layers**
   - ❌ Don't: Add patterns like `afterTransaction()` for problems that don't exist
   - ✅ Do: Put consistency-critical operations IN the transaction
   - ✅ Do: Put external effects AFTER the transaction returns

3. **Example: Simple, Explicit Approach**
   ```typescript
   // GOOD: Explicit and clear
   const ticket = await prisma.$transaction(async (tx) => {
     const ticket = await tx.ticket.create({ ... });
     
     // Audit log IN transaction (we want consistency)
     await tx.event.create({ action: "ticket.created", ... });
     
     return ticket;
   });
   
   // External effects AFTER transaction (if they fail, ticket still exists)
   try {
     await ScheduledTask.scheduleAutoClose(ticket.id, 24);
   } catch (error) {
     logger.error("Failed to schedule auto-close", error);
   }
   ```

#### Why This Matters

- **Dead simple**: No magic, no patterns to learn
- **Explicit**: You can see exactly what happens when
- **Flexible**: Decide per-case if something should be in/out of transaction
- **Testable**: Just mock the external services

Remember: The best code is code that doesn't need to exist. Only add abstractions when you have a real, recurring problem to solve.

## Important Patterns

```typescript
// Domain imports - use specific domain namespaces
import { Ticket, Panel, User } from "@ticketsbot/core/domains";

// Schema imports
import { TicketStatus, DiscordIdSchema, type DiscordId } from "@ticketsbot/core";

// Permission utilities
import { PermissionUtils, PermissionFlags } from "@ticketsbot/core";

// Analytics
import { captureEvent, createLogger } from "@ticketsbot/core/analytics";

// Auth imports
import { auth, getSession } from "@ticketsbot/core/auth";

// Context system (server-only)
import { Actor, withTransaction } from "@ticketsbot/core/context";
```

## Dependencies

- **zod** - Schema validation (v4 with latest features)
- **Critical**: Review `docs/zod-v4.md` before creating schemas - v4 has breaking changes
- **@sapphire/bitfield** - Permission flag operations
- **better-auth** - Authentication framework
- **@prisma/client** - Database ORM
- **bullmq** - Redis-backed job queues
- **posthog-node** - Analytics tracking
- **redis** - Redis client for sessions/caching
- **discord.js** - Discord API types and utilities

## Context System

### 🚨 Server-Only Imports

The context system uses Node.js-only APIs and must be imported from subpaths:

```typescript
// ✅ Correct - Server-side only
import { Actor, withTransaction } from "@ticketsbot/core/context";

// ❌ Wrong - Would break client-side builds
import { Actor } from "@ticketsbot/core";
```

### Actor Pattern

Unified authentication context for Discord and web users:

- **DiscordActor**: For bot commands with guildId, permissions
- **WebActor**: For API/dashboard with email, selectedGuildId
- **SystemActor**: For background jobs and system operations

### Transaction Management

```typescript
await withTransaction(async () => {
  // All database operations are transactional
  const ticket = await Ticket.create(data);

  // Schedule side effects after commit
  afterTransaction(async () => {
    await publishEvent("ticket.created", ticket);
    await sendDiscordNotification(ticket);
  });

  return ticket;
});
```

## Domain Namespaces

### Type Re-Export Pattern

Each domain module re-exports all its types and schemas from the main index file to provide a clean public API. This pattern:

- **Encapsulates internal structure**: Consumers import from the domain root (`@ticketsbot/core/domains/ticket`) rather than internal files
- **Provides type safety**: All domain types are available alongside the methods that use them
- **Maintains consistency**: Every domain follows the same pattern for predictable imports
- **Enables refactoring**: Internal file structure can change without breaking external imports

Note: ESLint may flag re-exported types as "unused". We use `eslint-disable-next-line` comments for these necessary re-exports.

### 13 Domain Namespaces

#### Core Entities

1. **User** - Discord user management
   - `ensure()`, `findById()`, `update()`
2. **Guild** - Server configuration
   - `ensure()`, `getSettings()`, `updateSettings()`
   - Blacklist sub-namespace
3. **Ticket** - Core ticket operations
   - `getById()`, `list()`, `update()`
   - Static: `findByChannelId()`, `isTicketChannel()`
4. **Panel** - Support panel management
   - `create()`, `update()`, `deploy()`, `getWithForm()`

#### Supporting Domains

5. **Team** - Roles and permissions
   - `hasPermission()`, `getUserPermissions()`, `assignRole()`
   - `ensureDefaultRoles()`, `getRoleByName()`
6. **Event** - Audit logging
   - `create()`, `listForGuild()`, `getStats()`
7. **Tag** - Support tag system
   - `create()`, `update()`, `findByName()`, `listForGuild()`
8. **Form** - Form field management
   - `create()`, `update()`, `reorder()`, `listForPanel()`

#### System Domains

9. **Account** - User account management
   - Account-related operations
10. **Analytics** - Tracking and metrics
    - `track()`, `identify()`, `captureError()`
11. **ScheduledTask** - BullMQ job scheduling
    - `initialize()`, `scheduleAutoClose()`, `cancelAutoClose()`
12. **TicketLifecycle** - Ticket lifecycle management
    - `create()`, `close()`, `claim()`, `requestClose()`
13. **Transcripts** - Message transcript handling
    - `getMessages()`, `formatTranscript()`, `exportToFile()`

## Usage

This package is imported by all other packages in the monorepo. It provides the foundation for type safety and validation across the entire system.

## Domain Pattern Details

Each domain follows a consistent file structure:

- **`index.ts`** - Public exports and type re-exports
- **`index.context.ts`** - Context-aware methods that use Actor for auth/permissions
- **`schemas.ts`** - Zod validation schemas for the domain
- **`static.ts`** - Static methods that don't require context (used in preconditions, etc.)

The separation allows for:

- Clear distinction between auth-required and public methods
- Better tree-shaking for client-side code
- Easier testing of business logic without context setup
