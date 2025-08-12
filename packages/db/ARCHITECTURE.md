# Database Package Architecture

## Directory Structure

The database operations are organized using Domain-Driven Design principles:

```
src/
├── operations/           # Domain operations
│   ├── analytics/       # Analytics domain
│   │   ├── index.ts    # Public exports
│   │   └── queries.ts  # Read operations
│   ├── discord-user/   # Discord user domain
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── guild/          # Guild domain
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── transactions.ts  # Complex multi-step operations
│   ├── panel/          # Panel domain
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── role/           # Role domain
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── transactions.ts  # Complex multi-step operations
│   ├── tag/            # Tag domain
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── ticket/         # Ticket domain
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── transactions.ts  # Complex state transitions
│   ├── transcript/     # Transcript domain
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── transactions.ts  # Complex multi-step operations
│   └── index.ts        # Backward compatibility exports
├── client.ts           # Prisma client instance
├── db.ts              # Unified database interface
└── index.ts           # Package exports
```

## Operation Types

Each domain can have up to three types of operation files:

### 1. `queries.ts` - Read Operations
- Read-only database queries
- No side effects
- Return data without modification
- Examples: `getById`, `list`, `search`, `count`

### 2. `mutations.ts` - Simple Write Operations
- Single-table updates
- Direct modifications
- Simple creates, updates, deletes
- Examples: `update`, `delete`, `toggle`

### 3. `transactions.ts` - Complex Multi-Step Operations
- Operations requiring database transactions
- Multi-table updates
- Business logic requiring atomicity
- State transitions with side effects
- Examples: `initialize`, `cleanupMember`, `createWithDefaults`

## Usage Patterns

### Using the Unified DB Client

```typescript
import { db } from '@ticketsbot/db';

// Simple queries
const ticket = await db.ticket.getById(123);
const panels = await db.panel.listPanelsByGuildId('guild123');

// Simple mutations
await db.tag.updateTag(tagId, guildId, { name: 'New Name' });
await db.role.assignRole(roleId, userId);

// Complex transactions
await db.guild.initialize({
  guildId: 'guild123',
  guildName: 'My Guild',
  ownerId: 'user123',
  ownerData: { ... }
});

await db.ticket.create({
  guildId: 'guild123',
  channelId: 'channel123',
  openerId: 'user123'
});

// Direct transaction access
await db.tx(async (tx) => {
  // Custom transaction logic
});

// Utilities
const isHealthy = await db.utils.healthCheck();
```

### Direct Domain Imports (Legacy Support)

For backward compatibility, you can still import operations directly:

```typescript
import { 
  getTicketById, 
  createPanel,
  initialize as initializeGuild 
} from '@ticketsbot/db/operations';
```

## Architecture Principles

### 1. Domain Separation
Each domain has its own subdirectory with clear boundaries. Domains should be:
- Self-contained
- Focused on a single business concept
- Independent from other domains

### 2. Operation Classification
Operations are classified by complexity and atomicity:
- **Queries**: Pure reads, no modifications
- **Mutations**: Simple writes to single tables
- **Transactions**: Complex operations requiring atomicity

### 3. Transaction Guidelines
Use `transactions.ts` when:
- Multiple tables need to be updated atomically
- Business rules require all-or-nothing operations
- Operations involve complex state transitions
- Multiple entities need to be created/updated together

### 4. Namespace Organization
The main `db.ts` uses namespace imports for:
- Cleaner organization
- Better IntelliSense support
- Clear domain boundaries
- Easier testing and mocking

### 5. Type Safety
- All operations maintain full TypeScript type safety
- Use proper Prisma types for inputs and outputs
- Avoid `any` types except for legacy compatibility

## Benefits

- **Clear Organization**: Operations are logically grouped by domain and type
- **Maintainability**: Each file has a single, clear purpose
- **Scalability**: New domains and operations can be added without affecting existing code
- **Testing**: Easy to mock specific domains or operation types
- **Discoverability**: Developers know exactly where to find specific operations
- **Transaction Safety**: Complex operations are clearly identified and properly isolated

## Examples of Each Operation Type

### Query Example
```typescript
// operations/ticket/queries.ts
export const getById = async (ticketId: number) => {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { opener: true, panel: true }
  });
};
```

### Mutation Example
```typescript
// operations/ticket/mutations.ts
export const updateChannelId = async (ticketId: number, channelId: string) => {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { channelId }
  });
};
```

### Transaction Example
```typescript
// operations/ticket/transactions.ts
export const create = async (data: CreateTicketData) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create ticket
    const ticket = await tx.ticket.create({ ... });
    
    // 2. Add participant
    await tx.ticketParticipant.create({ ... });
    
    // 3. Create lifecycle event
    await tx.ticketLifecycleEvent.create({ ... });
    
    return ticket;
  });
};
```

## Migration Notes

When refactoring existing code to this structure:
1. Identify operations using `prisma.$transaction`
2. Move them to `transactions.ts`
3. Keep simple CRUD operations in `mutations.ts`
4. Ensure all read operations are in `queries.ts`
5. Update index files to export from all operation files
6. Test that backward compatibility is maintained