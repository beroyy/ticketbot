# TicketsBot AI - Discord Support Ticket Management

A comprehensive Discord bot with web dashboard for managing support tickets. Features AI-powered enhancements, multi-panel systems, real-time transcript tracking, and responsive web interface.

## 🚀 Quick Start

Get your TicketsBot AI system running in under 5 minutes!

### Prerequisites

- Node.js 22+ and pnpm
- PostgreSQL database (local or cloud)
- Discord Application (for OAuth)
- Docker (for Redis) or local Redis installation

### 1. Setup Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
# Required: DATABASE_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_TOKEN, BETTER_AUTH_SECRET
```

### 2. Install & Start

```bash
# Install dependencies
pnpm install

# Start development environment (auto-initializes database and Redis)
pnpm dev

# Or with test data
pnpm dev --seed
```

### 3. Available Dev Commands

```bash
# Standard development
pnpm dev

# Include test data
pnpm dev --seed

# Skip all checks (fast restart)
pnpm dev --skip-checks

# Reset database and seed
pnpm dev --reset --seed

# Without Redis (if running elsewhere)
pnpm dev --no-redis

# Show all options
pnpm dev --help
```

### What Gets Started

- 🌐 **Web Dashboard** - http://localhost:3000
- 🔌 **API Server** - http://localhost:3001
- 🤖 **Discord Bot** - Connects using your token
- 🐳 **Redis** - Automatically via Docker (port 6379)
- 📦 **Database** - Initialized automatically if needed

The `pnpm dev` command intelligently:

- ✅ Checks PostgreSQL connection
- ✅ Initializes database schema if needed
- ✅ Starts Redis in Docker if not running
- ✅ Optionally seeds test data with `--seed`
- ✅ Starts all services in parallel

## 📋 Detailed Setup

### Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use existing one
3. Get your credentials:
   - `DISCORD_CLIENT_ID` - From "Application ID"
   - `DISCORD_CLIENT_SECRET` - From "OAuth2" section
   - `DISCORD_BOT_TOKEN` - From "Bot" section
4. Set OAuth2 redirect URI: `http://localhost:3000/auth/callback/discord`

### Database Setup

1. Set up PostgreSQL database (local or cloud)
2. Update `DATABASE_URL` in `.env`

### Authentication Setup

Authentication is handled by better-auth with Discord OAuth. No additional secrets needed - just configure Discord credentials.

## 🌍 Environment Configuration

The monorepo uses **@ticketsbot/env-config** for type-safe, validated environment variables across all applications. Supports **dev**, **staging**, and **prod** environments.

### Quick Setup

```bash
# Development
pnpm env:setup dev && pnpm dev

# Staging
pnpm env:setup staging && pnpm build && pnpm start

# Production
pnpm env:setup prod && pnpm build && pnpm start

# Validate environment at any time
pnpm env:validate
```

### Environment Validation

All applications validate their environment variables at startup using Zod schemas:

- ✅ **Type-safe** - No more `process.env.VARIABLE` with potential undefined
- ✅ **Early validation** - Errors caught at startup, not runtime
- ✅ **Clear error messages** - Know exactly what's missing or invalid
- ✅ **Automatic in Docker** - Containers validate before starting services

### Environment Files

- `.env.example` - Template with all variables
- `.env.dev` - Development defaults (committed)
- `.env.staging` - Staging defaults (committed)
- `.env.prod` - Production defaults (committed)
- `.env` - Active environment (auto-generated, git-ignored)

### Required Variables

```env
# Core
NODE_ENV="development"              # development/production/test
TURBO_ENV="dev"                    # dev/staging/prod
DATABASE_URL="postgresql://..."    # PostgreSQL connection (auto-generated)
DIRECT_URL="postgresql://..."      # Direct connection for migrations

# Port Configuration
PORT_LEVEL=4                       # Base port level (4000, 4001, 4002)
AUTO_PORT_DETECTION=true           # Automatically find available ports
WEB_PORT=4000                      # Web dashboard port
API_PORT=4001                      # API server port
BOT_PORT=4002                      # Bot health check port

# URLs (auto-calculated from PORT_LEVEL)
WEB_URL="http://localhost:4000"
API_URL="http://localhost:4001"
NEXT_PUBLIC_API_URL="http://localhost:4001"
DISCORD_REDIRECT_URI="http://localhost:4001/auth/callback/discord"

# Discord (required)
DISCORD_TOKEN="bot_token"
DISCORD_CLIENT_ID="app_id"
DISCORD_CLIENT_SECRET="app_secret"

# Authentication
BETTER_AUTH_SECRET="32+ char secret"  # Session encryption key

# Redis (optional)
REDIS_URL="redis://localhost:4379"   # For caching/sessions

# Development Features (optional)
DEV_PERMISSIONS_HEX="0xfffffff"      # Grant all permissions in dev
DEV_GUILD_ID="your_test_guild_id"    # Default guild for testing
DEV_DB_AUTO_SEED="true"              # Auto-seed database on startup
LOG_LEVEL="debug"                    # Logging verbosity
```

### Environment Commands

```bash
# Setup & Validation
pnpm env:setup <env>              # Setup specific environment
pnpm env:validate                 # Validate current .env file
pnpm env:validate --verbose       # Show all env vars (redacted)

# Environment-specific shortcuts
pnpm env:dev                      # Alias for env:setup dev
pnpm env:staging                  # Alias for env:setup staging
pnpm env:prod                     # Alias for env:setup prod
```

### Application-Specific Validation

Each app validates only the environment variables it needs:

```typescript
// apps/api/src/env.ts
const ApiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  DATABASE_URL: z.string().url(),
  API_PORT: z.string().transform(Number),
  // ... only API-specific vars
});

// apps/bot/src/config.ts
const BotEnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().url(),
  // ... only bot-specific vars
});

// apps/web/env.ts
const WebEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  // ... client and server vars separated
});
```

### Security Features

- 🔒 **Automatic secret redaction** in logs
- 🚨 **Validation errors** prevent startup with missing/invalid config
- 📋 **Type safety** throughout the codebase
- 🐳 **Docker validation** before service startup

### Automatic Port Detection

The env-setup script automatically detects port conflicts and adjusts PORT_LEVEL:

```bash
# If PORT_LEVEL=4 but ports 4000-4002 are in use:
🔍 Checking port availability starting at level 4...
⚠️  Level 4 has conflicts on ports: 4000, 4001, 4002
✅ Found available ports at level 5 (5000, 5001, 5002)
   Port Level: 5 (auto-adjusted from 4)
```

**Features:**

- ✅ Detects when requested ports are already in use
- ✅ Automatically bumps PORT_LEVEL to find available ports
- ✅ Updates all related URLs (API_URL, WEB_URL, etc.)
- ✅ Can be disabled with `AUTO_PORT_DETECTION=false`
- ✅ Prevents port conflicts when running multiple instances
- ✅ **Multi-worktree support** - Each git worktree gets unique ports automatically

## 🛠️ Development Scripts

### Running Services

```bash
# All services (recommended)
pnpm dev                # API + Bot + Web

# Individual services (run from package directory)
cd apps/api && pnpm dev    # API server
cd apps/bot && pnpm dev    # Discord bot
cd apps/web && pnpm dev    # Web dashboard

# Docker development
pnpm docker            # Build and run all services with live reload

# Multi-worktree development (NEW!)
git worktree add ../feature-branch
cd ../feature-branch && pnpm docker  # Automatic port assignment!
```

## 🔄 Multi-Worktree Development

Work on multiple features simultaneously without port conflicts:

```bash
# Create and work on multiple branches simultaneously
git worktree add ../feature-a && cd ../feature-a
pnpm start:docker  # Gets ports 4000-4002 (or first available)

# In another terminal
git worktree add ../feature-b && cd ../feature-b
pnpm start:docker  # Gets ports 5000-5002 (or next available)

# Each worktree is completely isolated:
# ✅ Unique ports automatically assigned
# ✅ Separate Docker containers
# ✅ Independent database branches
# ✅ No manual configuration required
```

**How it works:**

- Each worktree gets a unique ID based on its path
- Port levels are automatically assigned (4xxx, 5xxx, 6xxx, etc.)
- Docker containers are named `ticketsbot-dev-{worktree-id}`
- Database branches are isolated per worktree

### Database Management

```bash
pnpm db:generate       # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio (port 5555)

# Data Seeding
pnpm db:seed          # Seed with synthetic test data
pnpm db:seed:main     # Seed with real production data from main branch
```

### Testing

```bash
# E2E testing
pnpm e2e-test                               # Run smoke tests
pnpm e2e-test -- -t all --headed           # All tests with browser
pnpm e2e-test -- -t tickets --headed       # Ticket view tests
pnpm e2e-test -- -t responsive             # Responsive tests
```

### Build & Production

```bash
pnpm build            # Build all packages
pnpm start            # Start production servers
pnpm typecheck        # TypeScript validation
pnpm lint             # Check code style
pnpm format           # Format code with Prettier
```

## 🚀 CI/CD

### GitHub Actions

Automated code quality checks on push/PR to `main` branch:

- Type checking across all packages
- Linting with ESLint
- Uses Turborepo for fast incremental builds

### Deployment

**Web (Vercel):** Auto-deploys from `main` branch  
**API & Bot:** Manual deployment via `pnpm start`

Production startup handles:

1. Database schema sync (`db:push`)
2. Prisma client regeneration
3. Service startup with health checks

### Docker

Multi-stage build optimized for caching:

- Includes Redis for caching/sessions
- Exposes ports: API (3001), Bot (3002)
- Run with: `pnpm docker` or `docker compose up`

## 🏗️ Project Structure

```
ticketsbot-ai/
├── apps/
│   ├── api/           # REST API server (Hono)
│   ├── bot/           # Discord bot application
│   └── web/           # Web dashboard (Next.js)
├── packages/
│   ├── core/          # Core package - database, auth, schemas, domains, context system
│   ├── eslint-config/ # Shared ESLint configuration
│   ├── scripts/       # Development scripts, database tools, environment setup
│   ├── tsconfig/      # Shared TypeScript configuration
│   └── vitest-config/ # Shared test configuration
├── docker-compose.yml # Docker configuration for all services
├── Dockerfile         # Single container for all applications
├── render.yaml        # Render.com deployment configuration
└── README.md
```

## 🎫 Core Features

### Multi-Panel Ticket System

- General Support, Billing, Bug Report panels
- Custom forms for data collection
- Smart routing and categorization
- Real-time transcript tracking

### Web Dashboard

- Discord OAuth authentication
- Server selection interface
- Ticket management and filtering
- Responsive design across devices
- Real-time updates

### Discord Bot Commands

#### General

- `/about` - Bot information
- `/help` - Command reference
- `/invite` - Bot invite link

#### Ticket Management

- `/open [subject]` - Create ticket
- `/close [reason]` - Close ticket
- `/add <user>` - Add user to ticket
- `/claim` - Claim ticket
- `/transfer <user>` - Transfer ownership

#### Administration

- `/setup auto` - Complete server setup
- `/addadmin <user>` - Add administrator
- `/addsupport <user>` - Add support staff
- `/blacklist <user>` - Toggle blacklist

#### Tag System

- `/managetags add <name> <content>` - Create tag
- `/tag <id> [user]` - Send tag response

### Background Jobs (BullMQ)

- **Auto-close System** - Automatically close tickets after a specified delay
- **Scheduled Tasks** - Redis-backed job queue for reliable task scheduling
- **Job Management** - Retry logic, failure handling, and job monitoring
- **Graceful Degradation** - System continues working even if Redis is unavailable

### Domain Architecture

The system is organized into 11 domain namespaces:

- **Core Domains**: User, Guild, Ticket, Panel
- **Supporting Domains**: Team, Event, Tag, Form
- **System Domains**: ScheduledTask, TicketLifecycle, Analytics, Transcripts

### Advanced Features

- **Multi-Schema Validation** - Type-safe API with Zod schema validation
- **Context System** - AsyncLocalStorage-based context for clean architecture
- **Analytics Integration** - Built-in analytics and metrics tracking
- **Permission System** - BigInt-based permission flags for fine-grained access control

## 🎯 What You Get After Setup

After running the setup commands, you'll have:

- **5 test tickets** with realistic data
- **Working authentication** via Discord
- **Full UI functionality** matching design mockups
- **75-90% E2E test coverage** (up from 25%)

### Expected Test Results

**Before Integration:**

- ❌ 25% test success (4/16 tests passing)
- ❌ No ticket data visible
- ❌ Hydration errors in browser

**After Integration:**

- ✅ 75-90% test success (12-14/16 tests passing)
- ✅ Ticket cards with real data
- ✅ Working detail views and interactions
- ✅ Clean, responsive interface

## 🔧 Troubleshooting

### No Tickets Showing

```bash
pnpm db:seed  # Re-run seeding
```

- Check API is running on port 3001
- Verify Discord authentication is working

### Authentication Issues

- Check Discord OAuth setup in `.env`
- Ensure redirect URI matches: `http://localhost:3000/auth/callback/discord`
- Verify `NEXTAUTH_SECRET` is set

### Database Connection

- Verify PostgreSQL is running
- Check `DATABASE_URL` format in `.env`
- Run `pnpm db:push` to sync schema

### E2E Test Issues

- Ensure web server is running: `pnpm dev:web`
- Check test environment in packages/e2e/src/config/

## 🚀 Production Deployment

The system is production-ready with:

- ✅ Secure authentication flow
- ✅ Scalable API structure
- ✅ Comprehensive error handling
- ✅ TypeScript type safety
- ✅ Docker configuration available
- ✅ Comprehensive testing suite

## 🚀 Deployment Optimizations

### Render.com Build Optimizations

- **Build Filters** - Skip unnecessary builds when only docs/tests change
  - Reduces build frequency by 30-50%
  - See [Render Monorepo Docs](https://render.com/docs/monorepo-support)
- **Turborepo Environment Variables** - Optimize build performance
  - Disables telemetry for faster builds
  - Configures consistent cache directory
  - See [Turborepo Environment Variables](https://turbo.build/repo/docs/crafting-your-repository/using-environment-variables)
- **Multi-Stage Docker Builds** - Better layer caching
  - Separates dependency installation from source copying
  - Reduces rebuild time when only source changes
  - See [Docker Best Practices for Turborepo](https://turbo.build/repo/docs/guides/tools/docker)

## 📖 Development

### Creating Custom Panels

```typescript
const panelConfig = {
  title: "Custom Support",
  intro_title: "CUSTOM SUPPORT TICKET",
  intro_description: "Welcome <@{userId}>\nDescribe your issue...",
  channel_prefix: "custom",
  formFields: [
    {
      label: "Issue Type",
      type: "short_text",
      required: true,
      order_index: 0,
    },
  ],
};
```

### Transcript Data Structure

```typescript
interface TranscriptData {
  ticket: {
    id: number;
    opener: UserInfo;
    claimedBy?: UserInfo;
    formResponses: FormResponse[];
  };
  messages: {
    id: string;
    content: string;
    author: UserInfo;
    createdAt: Date;
    editedAt?: Date;
  }[];
}
```
