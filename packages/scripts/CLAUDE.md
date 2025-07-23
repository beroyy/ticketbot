# @ticketsbot/scripts

Centralized scripts package for the TicketsBot monorepo. This package contains all development, database, and utility scripts used across the project.

## Purpose

This package consolidates all scripts from various locations in the monorepo to:

- Provide a single source of truth for all scripts
- Enable easy script reuse across packages
- Simplify maintenance and updates
- Ensure consistent script behavior

## Script Categories

### Development Scripts (`src/dev/`)

- `env-setup.ts` - Environment configuration and setup
- `start-dev-services.ts` - Start all development services (Redis, API, Bot, Web)
- `start-redis.ts` - Redis container management
- `validate-env.mjs` - Environment validation

### Database Scripts (`src/db/`)

- `init-db.ts` - Initialize database schema
- `seed.ts` - Seed database with test data
- `seeders/` - Modular seeders for different entities

### Test Scripts (`src/test/`)

- `generate-test-token.ts` - Generate JWT tokens for testing

## Usage

### From Root package.json

Scripts are referenced in the root package.json:

```json
{
  "scripts": {
    "dev": "tsx packages/scripts/src/dev/start-dev-services.ts",
    "setup-env": "tsx packages/scripts/src/dev/env-setup.ts",
    "db:init": "tsx packages/scripts/src/db/init-db.ts",
    "db:seed": "tsx packages/scripts/src/db/seed.ts"
  }
}
```

### Direct Execution

Scripts with bin entries can be run directly:

```bash
pnpm exec ticketsbot-env-setup dev
pnpm exec ticketsbot-db-init
pnpm exec ticketsbot-db-seed
```

### From Other Packages

Import scripts as modules:

```typescript
import { setupEnvironment } from "@ticketsbot/scripts/env-setup";
```

## Adding New Scripts

1. Create the script in the appropriate category directory
2. Add an export entry in package.json if it should be importable
3. Add a bin entry if it should be executable
4. Update this documentation

## Dependencies

This package depends on:

- `@ticketsbot/core` - For database and schema access
- `tsx` - For TypeScript execution
- Node.js built-in modules for file/process operations
