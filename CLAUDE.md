# TicketsBot Monorepo Context

## Overview

TicketsBot is a Discord bot platform for customer support tickets. This monorepo contains the bot, web dashboard, and API using modern TypeScript and cloud-native architecture.

## 🚨 Critical Context: Pre-Launch Codebase

**This codebase hasn't been shipped yet!** This means:

- **No backwards compatibility concerns** - Make breaking changes when they improve architecture
- **Choose best patterns** - Always opt for the ideal solution, not the compromise
- **Refactor freely** - Don't preserve bad patterns just because they exist
- **Think long-term** - Build for maintainability, not migration ease

**Small team reality**: Maximum 2 developers will work on this repo:

- **Optimize for AI agents** - Structure code and docs for AI comprehension
- **Avoid over-engineering** - Skip complex workflows designed for large teams
- **Prioritize clarity** - Clear code beats clever abstractions
- **Document for context** - CLAUDE.md files are more valuable than complex tooling
- **YAGNI principle** - Build production-grade code, but don't add features/abstractions until actually needed

## Considerations Throughout Development

### Code Quality Improvements

- **Refactor verbose code**: Replace multi-line functions with concise arrow functions where it improves readability
- **Remove unnecessary type annotations**: Trust TypeScript's inference for obvious types
- **Consolidate related logic**: Look for scattered functions that belong together in namespaces
- **Eliminate temporary variables**: Use method chaining and implicit returns where clearer
- **Clean up package.json scripts**: Remove stale scripts, consolidate duplicates, ensure all commands work from root via Turbo
- **Root-level command access**: Every script a developer/agent needs should be runnable from the monorepo root

### Documentation Opportunities

- **Create CLAUDE.md files**: Most feature directories should have context files - add them when working in undocumented areas
- **Clean up comments**: Prefer one clear block comment over many line comments - remove redundant or obvious comments
- **Document complex logic**: Add inline comments only for non-obvious business rules
- **Update existing docs**: Fix outdated information as you encounter it
- **Record architectural decisions**: Note why certain patterns were chosen

### Architectural Patterns

- **Watch for coupling**: Identify and fix tight coupling between modules - each package should have clear boundaries
- **Identify prop drilling**: Mark functions that could benefit from the context system
- **Note transaction boundaries**: Flag areas where afterTransaction hooks would prevent bugs
- **Spot missing error handling**: Add proper error types instead of generic throws
- **Find repeated patterns**: Extract common logic into shared utilities

### Performance Considerations

- **Remove N+1 queries**: Use proper includes/joins when touching database code
- **Optimize imports**: Use specific imports rather than barrel imports where possible
- **Leverage caching**: Identify expensive operations that could benefit from Redis

### Security & Best Practices

- **Never log sensitive data**: Check for accidentally logged tokens, passwords, or PII
- **Validate at boundaries**: Ensure Zod validation exists for all external inputs
- **Use proper types**: Replace `any` with specific types or generics
- **Handle edge cases**: Add null checks and error boundaries where missing

### Migration & Validation

- **Document migration patterns**: When refactoring code, add before/after examples to a MIGRATION_EXAMPLES.md file
- **Create validation scripts**: Write quick scripts to test critical paths after changes (e.g., can create ticket, permissions work)
- **Run smoke tests**: After each phase, verify basic functionality still works before proceeding
- **Track breaking changes**: Keep a list of any API or interface changes that affect other parts of the system
- **Write tests on-the-fly**: Don't wait for Phase 4 - add Vitest unit tests and Playwright E2E tests as you refactor
  - Testing philosophy: **Minimal but thoughtful** - write few tests that cover critical paths
  - When touching a function, write a quick test for the happy path
  - When updating an API endpoint, add one integration test for success case
  - When modifying UI components, add a Playwright test for key user flow
  - Skip edge cases unless they're business-critical
  - Tests document expected behavior and catch regressions immediately

### 🚨 IMPORTANT: Never Guess

**Never guess**: It's always more helpful to pause implementation and ask for the documentation you need rather than making assumptions about:

- Business logic or requirements
- API behaviors or expected responses
- Database relationships or constraints
- Permission system rules
- Discord bot limitations or behaviors
- Any unclear architectural decisions

Remember: These are opportunities, not requirements. Focus on your primary task but improve code quality when it's on your path.

## Monorepo Structure

```
├── apps/
│   ├── api/        # Hono REST API with multi-schema validation
│   ├── bot/        # Discord.js bot with Sapphire framework
│   └── web/        # Next.js 15 dashboard with RSC
├── packages/
│   ├── core/       # Consolidated core package
│   │   ├── prisma/ # Database schemas and migrations
│   │   ├── domains/# 11 domain namespaces with business logic
│   │   ├── context/# AsyncLocalStorage context system
│   │   ├── auth/   # Better-auth integration
│   │   └── schemas/# Zod validation schemas
│   ├── eslint-config/  # Shared ESLint rules
│   ├── scripts/    # Development and environment management
│   │   ├── db/     # Database seeding and initialization
│   │   └── dev/    # Environment setup and validation
│   ├── tsconfig/   # Shared TypeScript configs
│   └── vitest-config/  # Shared test configuration
├── docker-compose.yml  # Docker configuration for all services
├── Dockerfile      # Single container for all applications
└── render.yaml     # Render.com deployment configuration
```

## Tech Stack

- **Runtime**: Node.js 22+
- **Package Manager**: pnpm with workspaces
- **Build System**: Turborepo
- **TypeScript**: 5.8.3 with strict mode
- **Database**: PostgreSQL with Prisma
- **Caching**: Redis
- **Validation**: Zod v4 API
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query v5, Zustand v5
- **Forms**: React Hook Form with Zod validation

## Architecture Overview

### Domain-Driven Design

Business logic is organized into **11 domain namespaces** in `@ticketsbot/core/domains`:

- **Core Entities**: User, Guild, Ticket, Panel
- **Supporting Domains**: Team, Event, Tag, Form
- **System Domains**: ScheduledTask, TicketLifecycle, Analytics, Transcripts

See domain namespace implementation in `packages/core/src/domains/` for details.

### Context System

AsyncLocalStorage-based context eliminates prop drilling:

- **Actor Pattern**: Unified auth for Discord/Web users
- **Transaction Management**: Automatic with afterTransaction hooks
- **🚨 Server-only imports**: Must use `@ticketsbot/core/context` subpath

See context system implementation in `packages/core/src/context/` for patterns.

### Application Architecture

- **API**: Context system implemented, domain-driven architecture
- **Bot**: Sapphire Framework, Discord.js v14
- **Web**: Controller hook pattern, React Server Components

## Key Architectural Decisions

- **Pre-launch flexibility**: No backward compatibility constraints
- **Small team optimization**: Built for 1-2 developers + AI agents
- **String Discord IDs**: All Discord IDs stored as strings
- **BigInt permissions**: Permission bitfields use BigInt
- **Zod v4 imports**: Using `from "zod"` for latest features
- **Consolidated core package**: All schemas now live in `@ticketsbot/core` (no separate schemas package)
- **Scripts package**: Centralized development, database, and utility scripts in `@ticketsbot/scripts`
- **BullMQ job queues**: Redis-backed scheduled tasks for auto-close and future background jobs
- **Multi-schema validation**: API uses route-specific schemas for type safety

## Development Workflow

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Start with Docker
pnpm docker

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Format code
pnpm format

# Build everything
pnpm build
```

## Environment Configuration

The monorepo uses a **minimal environment variable approach** where most values are automatically derived:

### Required Environment Variables (only 6!)

```env
# Core
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/ticketsbot
BETTER_AUTH_SECRET=your-32-character-secret

# Discord
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=your-discord-secret
```

### Optional Variables

```env
# Base configuration
PORT_OFFSET=3000              # Base port (default: 3000)
BASE_DOMAIN=ticketsbot.dev    # Required for production
REDIS_URL=redis://localhost:6379

# Feature flags
NEXT_PUBLIC_FEATURE_NEW_TICKET_UI=true
NEXT_PUBLIC_FEATURE_BULK_ACTIONS=false
NEXT_PUBLIC_FEATURE_ADVANCED_FORMS=false
```

### Automatically Derived Values

The system automatically derives these values:

- `WEB_URL`, `API_URL` - Based on NODE_ENV and BASE_DOMAIN
- `WEB_PORT`, `API_PORT`, `BOT_PORT` - Based on PORT_OFFSET
- `LOG_LEVEL`, `LOG_REQUESTS` - Based on NODE_ENV
- And many more...

This reduces configuration from 23+ variables to just 6 required ones!

## Important Patterns & Considerations

### Code Quality Improvements

- **Refactor verbose code**: Replace multi-line functions with concise arrow functions where it improves readability
- **Remove unnecessary type annotations**: Trust TypeScript's inference for obvious types
- **Consolidate related logic**: Look for scattered functions that belong together in namespaces
- **Eliminate temporary variables**: Use method chaining and implicit returns where clearer
- **Clean up package.json scripts**: Remove stale scripts, consolidate duplicates, ensure all commands work from root via Turbo
- **Root-level command access**: Every script a developer/agent needs should be runnable from the monorepo root

### Documentation Opportunities

- **Create CLAUDE.md files**: Most feature directories should have context files - add them when working in undocumented areas
- **Clean up comments**: Prefer one clear block comment over many line comments - remove redundant or obvious comments
- **Document complex logic**: Add inline comments only for non-obvious business rules
- **Update existing docs**: Fix outdated information as you encounter it
- **Record architectural decisions**: Note why certain patterns were chosen

### Architectural Patterns

- **Watch for coupling**: Identify and fix tight coupling between modules - each package should have clear boundaries
- **Identify prop drilling**: Mark functions that could benefit from the context system
- **Note transaction boundaries**: Flag areas where afterTransaction hooks would prevent bugs
- **Spot missing error handling**: Add proper error types instead of generic throws
- **Find repeated patterns**: Extract common logic into shared utilities

### Performance Considerations

- **Remove N+1 queries**: Use proper includes/joins when touching database code
- **Optimize imports**: Use specific imports rather than barrel imports where possible
- **Leverage caching**: Identify expensive operations that could benefit from Redis

### Security & Best Practices

- **Never log sensitive data**: Check for accidentally logged tokens, passwords, or PII
- **Validate at boundaries**: Ensure Zod validation exists for all external inputs
- **Use proper types**: Replace `any` with specific types or generics
- **Handle edge cases**: Add null checks and error boundaries where missing

### Migration & Validation

- **Document migration patterns**: When refactoring code, add before/after examples to a MIGRATION_EXAMPLES.md file
- **Create validation scripts**: Write quick scripts to test critical paths after changes (e.g., can create ticket, permissions work)
- **Run smoke tests**: After each phase, verify basic functionality still works before proceeding
- **Track breaking changes**: Keep a list of any API or interface changes that affect other parts of the system
- **Write tests on-the-fly**: Don't wait for Phase 4 - add Vitest unit tests and Playwright E2E tests as you refactor
  - Testing philosophy: **Minimal but thoughtful** - write few tests that cover critical paths
  - When touching a function, write a quick test for the happy path
  - When updating an API endpoint, add one integration test for success case
  - When modifying UI components, add a Playwright test for key user flow
  - Skip edge cases unless they're business-critical
  - Tests document expected behavior and catch regressions immediately

### 🚨 IMPORTANT: Never Guess

**Never guess**: It's always more helpful to pause implementation and ask for the documentation you need rather than making assumptions about:

- Business logic or requirements
- API behaviors or expected responses
- Database relationships or constraints
- Permission system rules
- Discord bot limitations or behaviors
- Any unclear architectural decisions

## Development Feature Flags

### Build-Time Feature Flags (UI Features)

The application supports build-time feature flags for UI features using Next.js environment variables:

1. **Available Feature Flags**:

   ```env
   # Enable new ticket UI design
   NEXT_PUBLIC_FEATURE_NEW_TICKET_UI=true

   # Enable bulk ticket operations
   NEXT_PUBLIC_FEATURE_BULK_ACTIONS=true

   # Enable advanced form builder
   NEXT_PUBLIC_FEATURE_ADVANCED_FORMS=true
   ```

2. **Usage in Code**:

   ```typescript
   // In React components
   if (process.env.NEXT_PUBLIC_FEATURE_NEW_TICKET_UI === 'true') {
     return <NewTicketUI />;
   }
   return <LegacyTicketUI />;
   ```

3. **Important Notes**:
   - Feature flags are **build-time only** - changing them requires rebuilding
   - Next.js statically replaces these values during build
   - Dead code elimination removes unused branches
   - All flags default to `'false'` if not set
   - Use string comparison (`=== 'true'`) for consistency

4. **Setting Feature Flags**:
   - **Development**: Add to `.env` file at project root
   - **CI/CD**: Set as GitHub Variables (not Secrets)
   - **Production**: Configure in Render.com environment groups

5. **Best Practices**:
   - Keep feature flag count under 10 for maintainability
   - Use descriptive names with `NEXT_PUBLIC_FEATURE_` prefix
   - Document what each flag controls in code comments
   - Remove flags after features are fully rolled out
   - Consider runtime flags only if you need gradual rollouts

### Automatic Database Seeding

To automatically seed the database when running `pnpm docker:dev`:

1. Add to your `.env` file:

   ```
   DEV_DB_AUTO_SEED=true
   ```

2. This will:
   - Run database initialization first
   - Then automatically run the seed script
   - Populate the database with test data (users, tickets, panels, etc.)
   - Only works in development mode

3. The seeding creates:
   - Multiple test users (customers, support, admin)
   - Support panels with different configurations
   - Sample tickets with conversations
   - Support tags and team roles

### Development Permissions Override

To override permissions for testing in development mode:

1. Add to your `.env` file:

   ```
   DEV_PERMISSIONS_HEX=0xfffffff  # For all permissions
   # Or any other BigInt value for specific permissions
   ```

2. This will:
   - Grant the specified permissions in development mode
   - Only work when NODE_ENV is 'development'
   - Log "🔧 DEV MODE: Granting permission..." when permissions are granted
   - Override actual database permissions for testing

3. Permission values (for reference):
   - `0x1` = TICKET_VIEW_SELF
   - `0x2` = TICKET_VIEW_CLAIMED
   - `0x4` = TICKET_VIEW_ALL
   - `0x8` = TICKET_CLAIM
   - `0x10` = TICKET_CLOSE_SELF
   - `0x20` = TICKET_CLOSE_CLAIMED
   - `0x40` = TICKET_CLOSE_ALL
   - `0x80` = TICKET_ASSIGN
   - `0x100` = TICKET_BLACKLIST
   - `0x200` = TICKET_EXPORT
   - `0x400` = GUILD_SETTINGS_VIEW
   - `0x800` = GUILD_SETTINGS_EDIT
   - `0x1000` = PANEL_CREATE
   - `0x2000` = PANEL_EDIT
   - `0x4000` = PANEL_DELETE
   - `0x8000` = PANEL_DEPLOY
   - `0x10000` = TEAM_ROLE_CREATE
   - `0x20000` = TEAM_ROLE_EDIT
   - `0x40000` = TEAM_ROLE_DELETE
   - `0x80000` = TEAM_ROLE_ASSIGN
   - `0x100000` = TEAM_ROLE_UNASSIGN
   - `0x200000` = MEMBER_BLACKLIST
   - `0x400000` = MEMBER_UNBLACKLIST
   - `0x800000` = TRANSCRIPT_VIEW_SELF
   - `0x1000000` = TRANSCRIPT_VIEW_CLAIMED
   - `0x2000000` = TRANSCRIPT_VIEW_ALL
   - `0x4000000` = TAG_MANAGE
   - `0x8000000` = STATS_VIEW
   - Full admin: `0xfffffff` (all 28 permissions)

## Common Issues & Solutions

### Authentication State Mismatch Error

If you encounter "State Mismatch. Verification not found" error when signing in:

1. **Clear cookies and local storage**:
   - Open browser DevTools (F12)
   - Go to Application tab
   - Clear all cookies for localhost:9000 and localhost:9001
   - Clear local storage
   - Try signing in again

2. **Ensure environment variables are correct**:

   ```
   WEB_URL=http://localhost:9000
   API_URL=http://localhost:9001
   ```

3. **Common causes**:
   - Stale OAuth state from previous attempts
   - Mismatched redirect URIs
   - Cookie domain issues
   - Cross-origin cookie blocking

### Port Conflicts

The env-setup script automatically detects available ports based on your worktree to avoid conflicts.

### Type Errors

Run `pnpm typecheck` to catch issues early. The build may succeed even with type errors, so always check types separately.

### BigInt Serialization

Use `.toString()` for JSON responses when dealing with BigInt values (permissions).

## Development Commands

When making code changes, always run these commands to ensure quality:

- `pnpm lint` - Check for linting errors
- `pnpm typecheck` - Check for TypeScript errors
- `turbo build` - Ensure everything builds correctly
- `pnpm env:validate` - Validate environment configuration
- `pnpm env:validate --minimal` - Show minimal .env example

## State Management Patterns (Web App)

### Simple Query Pattern

```typescript
// features/[feature]/queries.ts
// Use simple query objects to avoid Next.js build issues with complex types
export const featureQueries = {
  list: (filters: FilterType) => ({
    queryKey: ["features", "list", filters],
    queryFn: () => api.getFeatures(filters),
    staleTime: 30 * 1000,
  }),
  detail: (id: string) => ({
    queryKey: ["features", "detail", id],
    queryFn: () => api.getFeature(id),
    staleTime: 5 * 60 * 1000,
  }),
};
```

### Controller Hook Pattern

```typescript
// features/[feature]/hooks/use-[feature]-controller.ts
export function useFeatureController() {
  // 1. UI State (Zustand)
  const ui = useFeatureUIState();

  // 2. Server State (TanStack Query)
  const query = useQuery(featureQueries.list(ui.filters));

  // 3. Derived State (useMemo)
  const processed = useMemo(() => processData(query.data, ui.filters), [query.data, ui.filters]);

  // 4. Clean API
  return {
    data: processed,
    isLoading: query.isLoading,
    error: query.error,
    ui: {
      /* only what's needed */
    },
    actions: {
      /* all actions */
    },
  };
}
```

### UI Store Pattern

```typescript
// features/[feature]/stores/[feature]-ui-store.ts
interface FeatureUIState {
  // State
  filters: FilterState;
  view: ViewState;

  // Actions
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

export const useFeatureUIStore = create<FeatureUIState>()(
  devtools((set) => ({
    // State
    filters: defaultFilters,
    view: defaultView,

    // Actions
    setFilters: (filters) => {
      set((state) => ({
        filters: { ...state.filters, ...filters },
      }));
    },
    resetFilters: () => {
      set({ filters: defaultFilters });
    },
  }))
);

// Atomic selectors
export const useFeatureFilters = () => useFeatureUIStore((state) => state.filters);
```

### Component Pattern

```typescript
// features/[feature]/components/[Feature].tsx
export function Feature() {
  const ctrl = useFeatureController();

  if (ctrl.isLoading) return <Loading />;
  if (ctrl.error) return <Error error={ctrl.error} />;

  return (
    <div>
      {ctrl.data.map(item => (
        <Item
          key={item.id}
          data={item}
          onAction={ctrl.actions.handleAction}
        />
      ))}
    </div>
  );
}
```

### Quick Reference

1. **Never sync server state to client state**
2. **Always use atomic selectors for Zustand**
3. **Controller hooks are the only bridge between state layers**
4. **Components only know about their controller hook**
5. **Use plain objects for queries to avoid Next.js build issues**
6. **Keep return types simple - use `: any` if needed for complex hooks**

## Scheduled Task System (BullMQ)

### Overview

The `scheduled-task` domain manages background jobs using BullMQ with Redis:

- **Auto-close tickets** - Schedule tickets to close automatically after a delay
- **Job persistence** - Redis-backed queue survives restarts
- **Retry logic** - Automatic retries with exponential backoff
- **Graceful degradation** - System continues without Redis (immediate operations)

### Usage

```typescript
// Initialize on startup
await ScheduledTask.initialize();

// Schedule auto-close
const jobId = await ScheduledTask.scheduleAutoClose(ticketId, 24); // 24 hours

// Cancel if needed
await ScheduledTask.cancelAutoClose(jobId);

// Cleanup orphaned jobs
await ScheduledTask.cleanupOrphanedJobs();
```

## Multi-Schema Validation (API)

The API uses route-specific schemas for type safety:

```typescript
// Route-specific schemas in routes/schemas.ts
export const ticketSchemas = {
  list: z.object({
    query: z.object({
      status: TicketStatusSchema.optional(),
      page: z.coerce.number().int().positive().default(1),
    }),
  }),
  // ... other route schemas
};

// Used in route handlers
app.get("/tickets", validateRequest(ticketSchemas.list), async (c) => {
  const { status, page } = c.req.valid("query");
  // Type-safe access to validated data
});
```

## For AI Agents

- Each package has a CLAUDE.md with specific context
- Follow CODE_STYLE_PATTERNS.md for consistency
- Check MONOREPO_MODERNIZATION_PLAN.md for current goals
- Never guess - ask for clarification when unsure
- Remember: These are opportunities, not requirements. Focus on your primary task but improve code quality when it's on your path.
