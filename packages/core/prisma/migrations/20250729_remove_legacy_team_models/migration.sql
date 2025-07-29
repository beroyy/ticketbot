-- Remove legacy Team and TeamMember tables
-- These models were replaced by TeamRole and TeamRoleMember

-- Drop foreign key constraints first
ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_team_id_fkey";
ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_discord_id_fkey";
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_guild_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "teams_guild_id_idx";
DROP INDEX IF EXISTS "teams_deleted_at_idx";
DROP INDEX IF EXISTS "team_members_discord_id_idx";

-- Drop the tables
DROP TABLE IF EXISTS "team_members";
DROP TABLE IF EXISTS "teams";