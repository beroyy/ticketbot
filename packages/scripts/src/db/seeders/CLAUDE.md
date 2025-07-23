# Database Seeders

## Overview

This directory contains the modular database seeding system for TicketsBot. The seeders follow the domain-driven design pattern and integrate with the core package's domain namespaces.

## Architecture

### Key Components

1. **Orchestrator** (`index.ts`) - Coordinates all seeders in dependency order
2. **Per-Domain Seeders** - One seeder per domain (User, Guild, Team, etc.)
3. **Utilities** (`utils.ts`) - Shared utilities including Faker.js generators
4. **Types** (`types.ts`) - Shared TypeScript interfaces

### Domain Seeders

- `user.seeder.ts` - Creates Discord users with roles (customer, support, admin)
- `guild.seeder.ts` - Creates guilds with settings and blacklist entries
- `team.seeder.ts` - Creates team roles and assigns members
- `form.seeder.ts` - Creates forms with various field types
- `panel.seeder.ts` - Creates support panels (SINGLE and MULTI types)
- `tag.seeder.ts` - Creates support tags for quick responses
- `ticket.seeder.ts` - Creates tickets with realistic scenarios and messages
- `event.seeder.ts` - Creates audit log events

## Usage

### Command Line

```bash
# Default (medium environment)
pnpm db:seed

# Specify environment size
pnpm db:seed --environment small
pnpm db:seed --environment large

# Keep existing data
pnpm db:seed --no-clear

# Disable progress logging
pnpm db:seed --quiet

# Custom batch size
pnpm db:seed --batch-size 100
```

### Programmatic

```typescript
import { Seeder } from "@ticketsbot/scripts/db/seeders";

const seeder = new Seeder({
  environment: "medium",
  clearExistingData: true,
  enableProgressLogging: true,
  batchSize: 50,
});

await seeder.seed();
```

## Data Volumes

### Small Environment

- 3 users
- 2 panels
- 10 tickets
- 3 tags
- 2 blacklist entries

### Medium Environment (Default)

- 5 users
- 3 panels
- 500 tickets
- 5 tags
- 5 blacklist entries

### Large Environment

- 10 users
- 5 panels
- 1000 tickets
- 8 tags
- 10 blacklist entries

## Key Features

### Faker.js Integration

- Realistic user data (usernames, emails, avatars)
- Dynamic company names and buzzwords
- Varied ticket scenarios and priorities
- Random timestamps within past year

### Domain Integration

- Uses core package domain methods where available
- Falls back to direct Prisma for seed-specific operations
- Respects Zod validation through domain methods
- Proper transaction handling with context system

### Blacklist Support

- Automatically blacklists some customer users
- Uses the new targetId/isRole structure
- Configurable count based on environment

### Realistic Data

- Tickets have multi-message conversations
- Support staff claim and respond to tickets
- Proper status transitions (OPEN → CLOSED)
- Form responses with appropriate data types

## Development

### Adding New Seeders

1. Create `domain.seeder.ts` in this directory
2. Implement the seeder class with `seed()` and `clear()` methods
3. Import and instantiate in the orchestrator
4. Add to the dependency chain in proper order

### Best Practices

- Use transactions for data consistency
- Implement proper progress logging
- Handle batch operations for large datasets
- Respect foreign key constraints in clear operations
- Use Faker.js for realistic test data
