# CI/CD Documentation

## Overview

TicketsBot uses a streamlined CI/CD pipeline optimized for a small team (1-2 developers) with production-grade quality checks. The pipeline emphasizes speed, reliability, and simplicity while maintaining high code quality standards.

## Architecture

### Continuous Integration (GitHub Actions)

- **Single consolidated workflow** for all code quality checks
- **Parallel execution** of type checking and linting
- **Turborepo caching** for fast incremental builds
- **Environment validation** with cross-app consistency checks
- **Automated dependency updates** via Dependabot

### Continuous Deployment (Render.com)

- **Automatic deployments** from main branch
- **Single Docker container** running all services
- **Environment variable groups** for organized configuration
- **Health checks** for service monitoring
- **Zero-downtime deployments** with rolling updates

## GitHub Actions Workflow

### Code Quality Workflow (`code-quality.yml`)

The main CI workflow runs on:

- Push to `main` branch
- Pull requests to `main` branch

#### Jobs Structure

1. **Setup Job**
   - Extracts pnpm version from package.json
   - Generates cache keys for Turborepo
   - Outputs values for other jobs to use

2. **Code Quality Job**
   - Restores Turborepo cache
   - Creates and validates environment configuration
   - Runs type checking and linting in parallel
   - Saves Turborepo cache for future runs

3. **Environment Schema Validation Job**
   - Validates Zod schemas can parse environment
   - Ensures feature flags follow correct format
   - Tests cross-app environment consistency

4. **Quality Report Job**
   - Aggregates results from all checks
   - Fails if any quality check failed

### Environment Configuration

#### Required GitHub Secrets

```yaml
# Core (required)
DATABASE_URL                # PostgreSQL connection string
BETTER_AUTH_SECRET         # Must be at least 32 characters
DISCORD_TOKEN              # Discord bot token
DISCORD_CLIENT_ID          # Discord app client ID
DISCORD_CLIENT_SECRET      # Discord app client secret

# Optional
REDIS_URL                  # Redis connection (if using cloud Redis)
TURBO_TOKEN                # For Turborepo remote caching
```

#### GitHub Variables (non-sensitive)

```yaml
# Core Configuration
NODE_ENV                   # test/development/production (default: test)

# Optional Base Configuration
BASE_DOMAIN                # Your domain (e.g., ticketsbot.dev) - required for production
PORT_OFFSET                # Base port for services (default: 3000)

# Feature Flags (all optional, default: 'false')
NEXT_PUBLIC_FEATURE_NEW_TICKET_UI    # Enable new ticket UI
NEXT_PUBLIC_FEATURE_BULK_ACTIONS     # Enable bulk operations
NEXT_PUBLIC_FEATURE_ADVANCED_FORMS   # Enable advanced form builder
NEXT_PUBLIC_GUILD_ID                 # Development guild ID

# Development Helpers (optional)
DEV_PERMISSIONS_HEX        # Override permissions in development
DEV_GUILD_ID              # Development Discord server ID

# Turborepo
TURBO_TEAM                 # Team name for Turbo cache
```

#### Automatically Derived Values

The following values are automatically calculated and don't need to be set:

```yaml
# URLs (derived from NODE_ENV and BASE_DOMAIN/PORT_OFFSET)
WEB_URL                    # http://localhost:3000 or https://{BASE_DOMAIN}
API_URL                    # http://localhost:3001 or https://{BASE_DOMAIN}
NEXT_PUBLIC_API_URL        # Always matches API_URL

# Ports (derived from PORT_OFFSET)
WEB_PORT                   # PORT_OFFSET (default: 3000)
API_PORT                   # PORT_OFFSET + 1 (default: 3001)
BOT_PORT                   # PORT_OFFSET + 2 (default: 3002)

# Discord OAuth (derived from API_URL)
DISCORD_REDIRECT_URI       # {API_URL}/auth/callback/discord

# Smart Defaults (based on NODE_ENV)
LOG_LEVEL                  # debug in dev, warn in prod
LOG_REQUESTS               # true in dev, false in prod
RATE_LIMIT_ENABLED         # false in dev, true in prod
COOKIE_DOMAIN              # undefined in dev, .{BASE_DOMAIN} in prod
```

### Turborepo Caching

The workflow uses GitHub Actions cache to store Turborepo artifacts:

```yaml
path: |
  .turbo              # Turborepo cache
  apps/*/dist         # Built outputs
  apps/*/.next/cache  # Next.js cache
  packages/*/dist     # Package builds
```

Cache keys are based on:

- Operating system
- Lock file hash
- turbo.json configuration
- Git commit SHA

This ensures:

- Cache hits for unchanged code
- Automatic invalidation on dependency changes
- Isolation between different commits

## Render.com Deployment

### Configuration Structure

The `render.yaml` file defines:

1. **Service Configuration**

   ```yaml
   type: web
   runtime: docker
   autoDeploy: true # Deploy on push to main
   healthCheckPath: /health
   numInstances: 1 # Single instance for starter plan
   ```

2. **Environment Variable Groups**
   - `ticketsbot-ai-core` - URLs, ports, basic config
   - `ticketsbot-ai-secrets` - Sensitive credentials
   - `ticketsbot-ai-features` - Feature flags

3. **Docker Command**
   - Runs database migrations on startup
   - Starts all three services concurrently
   - Uses color-coded output for debugging

### Deployment Process

1. Push to `main` branch triggers deployment
2. Render builds Docker image with build args
3. Environment variables injected at runtime
4. Health checks ensure services are ready
5. Traffic switches to new instance
6. Old instance terminated

### Feature Flag Management

Feature flags are managed through environment variables:

```env
# UI Feature Flags (build-time)
NEXT_PUBLIC_FEATURE_NEW_TICKET_UI=true
NEXT_PUBLIC_FEATURE_BULK_ACTIONS=false
NEXT_PUBLIC_FEATURE_ADVANCED_FORMS=false
```

To update feature flags:

1. Update in Render dashboard under "Environment Groups"
2. Redeploy service (automatic if changed in dashboard)
3. Next.js rebuilds with new flag values

## Dependabot Configuration

Automated dependency updates run weekly:

- **NPM packages** - Groups minor/patch updates
- **GitHub Actions** - Keeps workflows updated
- **Excluded packages** - React, Node types (major versions)
- **PR limits** - Maximum 10 open PRs

### Handling Dependabot PRs

1. Review grouped minor/patch updates
2. Check CI passes on PR
3. Test locally if needed
4. Merge when ready

## Local Development

### Running CI Checks Locally

```bash
# Run the same checks as CI
pnpm typecheck
pnpm lint

# Run with Turborepo (like CI)
pnpm turbo run typecheck lint

# Validate environment
pnpm env:validate
```

### Debugging CI Failures

1. **Type Check Failures**

   ```bash
   # Generate Prisma client first
   pnpm --filter @ticketsbot/core db:generate

   # Run type check
   pnpm typecheck
   ```

2. **Lint Failures**

   ```bash
   # Run with auto-fix
   pnpm lint:fix

   # Check specific files
   pnpm eslint apps/web/pages/tickets.tsx
   ```

3. **Environment Validation**

   ```bash
   # Create test .env
   cp .env.example .env

   # Validate
   pnpm env:validate
   ```

## Best Practices

### For Pull Requests

1. **Small, focused changes** - Easier to review and deploy
2. **Descriptive PR titles** - Used in deployment logs
3. **Link related issues** - Provides context
4. **Wait for CI** - Don't merge until checks pass

### For Feature Flags

1. **Use descriptive names** - `NEXT_PUBLIC_FEATURE_NEW_TICKET_UI`
2. **Default to false** - Features off by default
3. **Clean up old flags** - Remove after full rollout
4. **Document in code** - Comment what each flag controls

### For Environment Variables

1. **Never commit secrets** - Use GitHub Secrets
2. **Validate early** - Fail fast in CI
3. **Keep parity** - Dev/staging/prod should be similar
4. **Document requirements** - Update this file when adding

## Monitoring and Alerts

### Health Checks

- API: `GET /health`
- Bot: Internal Discord connection status
- Web: Next.js build status

### Deployment Notifications

Configure in Render dashboard:

- Slack webhooks
- Email notifications
- Discord webhooks

## Troubleshooting

### Common Issues

1. **"Environment validation failed"**
   - Check all required variables are set
   - Verify DATABASE_URL format
   - Ensure secrets are in GitHub Secrets, not Variables

2. **"Cache not found"**
   - Normal for first run or after dependency updates
   - Subsequent runs will be cached

3. **"Type check failed"**
   - Run `pnpm db:generate` locally
   - Check for missing dependencies
   - Verify import paths

4. **"Deployment failed on Render"**
   - Check build logs in Render dashboard
   - Verify all environment variables set
   - Check Docker build output

### Recovery Procedures

1. **Rollback Deployment**
   - Use Render dashboard "Rollback" button
   - Reverts to previous successful deployment

2. **Clear Cache**
   - Delete `.turbo` folder
   - Push empty commit: `git commit --allow-empty -m "Clear cache"`

3. **Emergency Fixes**
   - Create hotfix branch from main
   - Make minimal fix
   - PR directly to main
   - Deploy immediately after merge

## Future Improvements

As the team grows, consider:

1. **Staging environment** - Test before production
2. **E2E tests in CI** - Automated user flow testing
3. **Performance budgets** - Bundle size limits
4. **Security scanning** - Dependency vulnerability checks
5. **Monitoring integration** - Sentry, DataDog, etc.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render.com Documentation](https://render.com/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
