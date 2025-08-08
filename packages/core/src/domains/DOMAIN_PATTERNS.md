# Domain Architecture Patterns

## Overview

This codebase uses an **unconventional but powerful** domain pattern that separates system-level operations from user-context operations. While not idiomatic in the JavaScript ecosystem, it provides strong security boundaries and clear separation of concerns.

## The Pattern

### Three-File Structure (Complex Domains)

```
domain/
├── static.ts         # System-level operations (no permission checks)
├── index.context.ts  # User-context operations (with permission checks)
└── index.ts         # Barrel exports combining both
```

### Key Concepts

1. **"Static" = System Operations**
   - Functions in `static.ts` are NOT class static methods
   - They're system-level operations that bypass permission checks
   - Used for internal operations, background jobs, and admin tasks

2. **Context = User Operations**
   - Functions in `index.context.ts` require user context
   - Always check permissions via the Actor system
   - Use AsyncLocalStorage to access implicit context

3. **Namespace Pattern**
   - All domains export TypeScript namespaces, not classes
   - Functions are `const` arrow functions within namespaces
   - This allows tree-shaking and cleaner imports

## Pattern Examples

### Simple Domain (Single File)
```typescript
// account/index.ts
export namespace Account {
  export type Account = PrismaAccount;
  
  export const findByUserId = async (userId: string) => {
    return prisma.account.findMany({ where: { userId } });
  };
}
```

### Complex Domain (Three Files)

**System Operations (static.ts):**
```typescript
// No permission checks - direct database access
export const getByIdUnchecked = async (ticketId: number) => {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { messages: true }
  });
};
```

**Context Operations (index.context.ts):**
```typescript
export namespace Ticket {
  // Uses Actor context for permissions
  export const getById = async (ticketId: number) => {
    const guildId = Actor.guildId();
    const userId = Actor.userId();
    
    // Check permissions first
    await Role.requirePermissions(Permission.TICKET_VIEW_ALL);
    
    return getByIdUnchecked(ticketId);
  };
}
```

**Barrel Export (index.ts):**
```typescript
// Export context-aware namespace
export { Ticket } from "./index.context";

// Export system functions for internal use
export {
  getByIdUnchecked,
  findByChannelId,
  isTicketChannel
} from "./static";
```

## When to Use Each Pattern

### Use Simple (Single File) When:
- Domain has < 10 functions
- No complex permission logic
- Mostly CRUD operations
- Examples: Account, Event, Tag, User

### Use Complex (Three Files) When:
- Domain has permission-based operations
- Mix of system and user operations
- Complex business logic
- Examples: Ticket, Guild, Panel, Role

## The Context System

The AsyncLocalStorage-based context system provides implicit user context:

```typescript
// Set by API/Bot at request boundary
Context.run({ actor, db }, async () => {
  // Anywhere in the call stack:
  const guildId = Actor.guildId(); // Automatically available
  const userId = Actor.userId();   // No prop drilling needed
});
```

## Current Domain Distribution

**Complex Pattern (7/11):**
- Guild, Ticket, Panel (with static.ts)
- TicketLifecycle, Transcripts, Role, Form (without static.ts)

**Simple Pattern (4/11):**
- User, Event, Tag, Account

**Special Cases:**
- Analytics: Single large file (875 lines) - cohesive analytics logic
- ScheduledTask: Class-based singleton for BullMQ integration

## Anti-Patterns to Avoid

1. **Don't mix patterns** - Choose simple or complex, not both
2. **Don't skip permission checks** - Context operations must validate
3. **Don't use classes** - Stick to namespace functions (except ScheduledTask)
4. **Don't expose unchecked functions** - Keep system operations internal

## Why This Architecture?

1. **Security First**: Permission checks can't be accidentally bypassed
2. **No Prop Drilling**: Context flows implicitly through AsyncLocalStorage
3. **Clear Boundaries**: System vs User operations are explicit
4. **Type Safety**: Full TypeScript support with namespace types
5. **Tree Shaking**: Unused functions are eliminated in builds

While unconventional, this pattern provides strong guarantees about security and separation of concerns that are valuable for a multi-tenant Discord bot platform.