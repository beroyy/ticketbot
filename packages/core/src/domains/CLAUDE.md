# Domain Patterns Quick Reference

## Pattern Cheatsheet

### Domain Organization
```
Simple Domain (1 file):  Account, Event, Tag, User
Complex Domain (3 files): Guild, Ticket, Panel
Context Only (2 files):  Role, Transcripts, TicketLifecycle, Form
Special Cases:          Analytics (large single file), ScheduledTask (class-based)
```

### Key Terms
- **"static.ts"** = System operations without permission checks (misleading name - not class statics!)
- **"index.context.ts"** = User operations with permission checks via Actor
- **"index.ts"** = Barrel export combining both

## Common Operations

### Creating a Simple Domain
```typescript
// domains/mynewdomain/index.ts
import { prisma } from "@ticketsbot/db";

export namespace MyNewDomain {
  export type MyType = PrismaMyType;
  
  export const findById = async (id: string) => {
    return prisma.myTable.findUnique({ where: { id } });
  };
}
```

### Creating a Complex Domain

**Step 1: System operations (static.ts)**
```typescript
export const getByIdUnchecked = async (id: string) => {
  return prisma.myTable.findUnique({ where: { id } });
};
```

**Step 2: Context operations (index.context.ts)**
```typescript
import { Actor, requireContext } from "@ticketsbot/core/context";
import { getByIdUnchecked } from "./static";

export namespace MyDomain {
  export const getById = async (id: string) => {
    const userId = Actor.userId();
    await Role.requirePermissions(Permission.MY_PERMISSION);
    return getByIdUnchecked(id);
  };
}
```

**Step 3: Barrel export (index.ts)**
```typescript
export { MyDomain } from "./index.context";
export { getByIdUnchecked } from "./static";
```

### Using Context
```typescript
// Available in any context-aware function:
const guildId = Actor.guildId();
const userId = Actor.userId(); 
const { db } = await requireContext();
```

### Adding Permission Checks
```typescript
// Single permission
await Role.requirePermissions(Permission.TICKET_VIEW_ALL);

// Multiple permissions (OR)
await Role.requireAnyPermission([
  Permission.TICKET_VIEW_ALL,
  Permission.TICKET_VIEW_CLAIMED
]);

// Check without throwing
const hasPermission = await Role.hasPermissions(Permission.PANEL_EDIT);
```

## Domain Function Patterns

### Query Pattern
```typescript
export const findByGuildId = async (guildId: string) => {
  return prisma.ticket.findMany({
    where: { guildId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { opener: true }
  });
};
```

### Boolean Check Pattern
```typescript
export const isTicketChannel = async (channelId: string) => {
  const ticket = await findByChannelId(channelId);
  return !!ticket;
};
```

### Create Pattern (with transaction)
```typescript
export const create = async (data: CreateData) => {
  const { db } = await requireContext();
  
  return db.$transaction(async (tx) => {
    const record = await tx.myTable.create({ data });
    
    afterTransaction(() => {
      // Side effects after commit
      EventEmitter.emit("created", record);
    });
    
    return record;
  });
};
```

## Domain Reference Table

| Domain | Pattern | Files | Context? | Key Purpose |
|--------|---------|-------|----------|-------------|
| Account | Simple | 1 | No | OAuth account queries |
| Analytics | Simple | 1 | Yes | Statistics & reporting |
| Event | Simple | 1 | No | Event tracking |
| Form | Context | 2 | Yes | Form management |
| Guild | Complex | 3 | Yes | Guild/server operations |
| Panel | Complex | 3 | Yes | Support panel CRUD |
| Role | Context | 2 | Yes | Permission management |
| ScheduledTask | Class | 1 | No | BullMQ job scheduling |
| Tag | Simple | 1 | No | Support tag CRUD |
| Ticket | Complex | 3 | Yes | Ticket operations |
| TicketLifecycle | Context | 2 | Yes | Ticket state changes |
| Transcripts | Context | 2 | Yes | Ticket history |
| User | Simple | 1 | No | User operations |

## Important Notes

1. **Never guess permissions** - Check existing domains for patterns
2. **Static ≠ Class Static** - These are module-level functions
3. **Context is implicit** - No need to pass it as parameter
4. **Transactions use context db** - Use `const { db } = await requireContext()`
5. **AfterTransaction for side effects** - Runs after commit

## Common Gotchas

- Forgetting permission checks in context functions
- Using `prisma` directly instead of `db` from context in transactions
- Exposing unchecked functions in public exports
- Not using `Actor.guildId()` for multi-tenant isolation
- Mixing patterns within a single domain