# Testing Discord Rate Limit Fix

## Summary of Changes

We've successfully eliminated redundant Discord API calls by implementing a caching mechanism:

### Before (4 Discord API calls on login):
1. OAuth callback: `/users/@me` (user profile)
2. OAuth callback: `/users/@me/guilds` (guild list)
3. API endpoint: `/users/@me/guilds` (duplicate)
4. API endpoint: `/users/@me` (duplicate)

### After (2 Discord API calls on login, 0 on subsequent requests):
1. OAuth callback: `/users/@me` (user profile)
2. OAuth callback: `/users/@me/guilds` (guild list)
3. API endpoint: Uses cached guild data (0 Discord calls within 5 minutes)

## Key Changes Made:

1. **Added guilds JSONB column to DiscordUser table** - Stores cached guild data with timestamp
2. **Updated OAuth callback** - Caches all user guilds (not just admin ones) with isAdmin flag
3. **Updated API /discord/guilds endpoint** - Checks cache first, only calls Discord if stale (>5 minutes)
4. **Fixed guild sync** - Only syncs guilds where bot is installed
5. **Created cleanup migration** - Removes invalid guild records

## Test Instructions:

### 1. Run the Migration
```bash
# Apply the database migration
pnpm db:push

# Clean up invalid guild records
pnpm migrate:cleanup-guilds
```

### 2. Test OAuth Flow
1. Clear all cookies/storage for localhost:9000 and localhost:9001
2. Sign in via Discord OAuth
3. Check API logs - should see only 2 Discord API calls during OAuth
4. Check database - `DiscordUser.guilds` should be populated

### 3. Test Guild List API
1. Call GET `/api/discord/guilds`
2. First call may fetch from Discord if OAuth didn't complete
3. Subsequent calls within 5 minutes should use cache (0 Discord API calls)
4. Check logs for "Using cached guilds" message

### 4. Test Guild Sync
1. Call POST `/api/discord/guilds/sync`
2. Should only process guilds where bot is installed
3. Should skip guilds where `botInstalled = false`

### 5. Verify Rate Limiting is Fixed
1. Sign in/out multiple times rapidly
2. No more 429 errors in production logs
3. Discord API calls reduced from 4 to 2 (or 0 with cache)

## Expected Behavior:

- **Login**: 2 Discord API calls (OAuth only)
- **Guild list (cached)**: 0 Discord API calls
- **Guild list (stale cache)**: 1 Discord API call
- **Guild sync**: Uses cached data, 0 Discord API calls

## Monitoring:

Watch for these log messages:
- "Using cached guilds" - Cache hit
- "Fetched and cached guilds from Discord" - Cache miss
- "Skipping guild X - bot not installed" - Proper filtering

## Architecture Notes:

- Guild table only contains guilds where bot is installed
- All user's guilds are cached with admin status for flexibility
- 5-minute cache TTL balances freshness vs API calls
- OAuth callback sets up roles only for installed guilds