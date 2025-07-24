# @ticketsbot/scripts

Centralized development, database, and utility scripts for the TicketsBot monorepo. This package provides all the tooling needed for environment setup, database management, and development workflows.

## Overview

`@ticketsbot/scripts` consolidates all operational scripts into a single package, providing:

- **Environment Management** - Multi-environment setup with port detection
- **Database Operations** - Schema initialization and intelligent seeding
- **Development Tools** - Service orchestration and Redis management
- **Test Utilities** - Token generation for testing

## Key Features

### 🚀 Smart Environment Setup

- Automatic port detection for multi-worktree development
- Environment-specific configurations (dev/staging/prod)
- Neon database branch management
- Comprehensive environment validation

### 🌱 Intelligent Database Seeding

- Three environment sizes (small/medium/large)
- Domain-driven seeder architecture
- Realistic data with Faker.js
- Batch processing for large datasets

### 🔧 Development Orchestration

- One-command development startup
- Automatic Redis container management
- Graceful service shutdown
- Progress logging and error handling

## Script Categories

### Development Scripts (`src/dev/`)

#### `env-setup.ts`

Sophisticated environment configuration with:

- Port level detection (4000, 5000, 6000, etc.)
- Worktree-aware configuration
- Neon branch creation/management
- URL generation and validation

```bash
# Setup for development
pnpm env:setup dev

# Setup with custom port level
PORT_LEVEL=7 pnpm env:setup dev

# Disable auto port detection
AUTO_PORT_DETECTION=false pnpm env:setup dev
```

#### `start-dev-services.ts`

Orchestrates all development services:

```bash
# Start everything (Redis + all apps)
pnpm dev

# What it does:
# 1. Runs env setup
# 2. Starts Redis container
# 3. Launches all apps with Turbo
```

#### `start-redis.ts`

Redis container management:

```bash
# Start Redis
pnpm redis:start

# Stop Redis
pnpm redis:stop
```

#### `validate-env.mjs`

Environment validation:

```bash
# Validate current environment
pnpm env:validate

# Verbose output (shows all vars)
pnpm env:validate --verbose
```

### Database Scripts (`src/db/`)

#### `init-db.ts`

Database schema initialization:

```bash
# Initialize database
pnpm db:init

# What it does:
# 1. Generates Prisma client
# 2. Pushes schema to database
# 3. Validates connection
```

#### `seed.ts`

Comprehensive database seeding:

```bash
# Default seeding (medium environment)
pnpm db:seed

# Small dataset (quick testing)
pnpm db:seed --environment small

# Large dataset (stress testing)
pnpm db:seed --environment large

# Keep existing data
pnpm db:seed --no-clear

# Custom batch size
pnpm db:seed --batch-size 100
```

#### Seeder Architecture (`seeders/`)

Domain-specific seeders with dependency management:

- **UserSeeder** - Discord users with roles
- **GuildSeeder** - Servers with settings
- **TeamSeeder** - Role assignments
- **PanelSeeder** - Support panels
- **FormSeeder** - Dynamic forms
- **TicketSeeder** - Realistic ticket scenarios
- **TagSeeder** - Quick response tags
- **EventSeeder** - Audit logs

### Test Scripts (`src/test/`)

#### `generate-test-token.ts`

JWT token generation for testing:

```bash
# Generate test token
tsx packages/scripts/src/test/generate-test-token.ts
```

## Usage Examples

### From Root Package

Most scripts are aliased in the root package.json:

```bash
# Development
pnpm dev                # Start all services
pnpm env:setup dev      # Setup environment
pnpm env:validate       # Validate environment

# Database
pnpm db:init           # Initialize schema
pnpm db:seed           # Seed with test data
pnpm db:generate       # Generate Prisma client

# Redis
pnpm redis:start       # Start Redis container
pnpm redis:stop        # Stop Redis container
```

### Direct Execution

Scripts with bin entries:

```bash
pnpm exec ticketsbot-env-setup dev
pnpm exec ticketsbot-db-init
pnpm exec ticketsbot-db-seed
```

### Programmatic Usage

Import as modules:

```typescript
import { Seeder } from "@ticketsbot/scripts/db/seeders";

const seeder = new Seeder({
  environment: "large",
  clearExistingData: true,
  batchSize: 100,
});

await seeder.seed();
```

## Environment Sizes

### Small Environment

- 3 users (1 admin, 1 support, 1 customer)
- 2 panels
- 10 tickets
- Quick setup for basic testing

### Medium Environment (Default)

- 5 users (mixed roles)
- 3 panels
- 500 tickets
- Balanced for development

### Large Environment

- 10 users
- 5 panels
- 1000 tickets
- Performance testing

## Architecture Highlights

### Port Detection System

The env-setup script intelligently assigns ports based on:

1. Git worktree location (unique ID per worktree)
2. Available port ranges (4xxx, 5xxx, 6xxx, etc.)
3. Automatic conflict detection

### Domain Integration

Seeders use the core package's domain methods:

- Respects business logic validation
- Uses proper context system
- Falls back to Prisma for seed-specific operations

### Progress Tracking

All long-running operations include:

- Progress bars for batch operations
- Clear status messages
- Error reporting with context

## Adding New Scripts

1. Create script in appropriate directory:
   - `src/dev/` - Development tools
   - `src/db/` - Database operations
   - `src/test/` - Testing utilities

2. Add exports to package.json:

   ```json
   "exports": {
     "./my-script": "./src/category/my-script.ts"
   }
   ```

3. Add bin entry if executable:

   ```json
   "bin": {
     "ticketsbot-my-script": "./src/category/my-script.ts"
   }
   ```

4. Update root package.json if needed:
   ```json
   "scripts": {
     "my-script": "tsx packages/scripts/src/category/my-script.ts"
   }
   ```

## Dependencies

- **@ticketsbot/core** - Domain logic and database access
- **@faker-js/faker** - Realistic test data generation
- **commander** - CLI argument parsing
- **tsx** - TypeScript execution
- **Built-in Node.js modules** - File/process operations

## Best Practices

- Use shebang `#!/usr/bin/env tsx` for executable scripts
- Implement proper error handling and exit codes
- Add progress logging for long operations
- Validate inputs with commander or manual checks
- Use transactions for database operations
- Document complex logic with comments
