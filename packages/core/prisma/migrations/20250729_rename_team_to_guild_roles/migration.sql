-- Rename team_* tables to guild_* to better reflect their purpose
-- These are guild-scoped roles, not team roles

-- Rename tables
ALTER TABLE "team_roles" RENAME TO "guild_roles";
ALTER TABLE "team_role_members" RENAME TO "guild_role_members";
ALTER TABLE "team_member_permissions" RENAME TO "guild_member_permissions";

-- Update foreign key constraint names for guild_roles
ALTER TABLE "guild_roles" RENAME CONSTRAINT "team_roles_guild_id_fkey" TO "guild_roles_guild_id_fkey";

-- Update foreign key constraint names for guild_role_members
ALTER TABLE "guild_role_members" RENAME CONSTRAINT "team_role_members_discord_id_fkey" TO "guild_role_members_discord_id_fkey";
ALTER TABLE "guild_role_members" RENAME CONSTRAINT "team_role_members_team_role_id_fkey" TO "guild_role_members_guild_role_id_fkey";
ALTER TABLE "guild_role_members" RENAME CONSTRAINT "team_role_members_assigned_by_id_fkey" TO "guild_role_members_assigned_by_id_fkey";

-- Update foreign key constraint names for guild_member_permissions
ALTER TABLE "guild_member_permissions" RENAME CONSTRAINT "team_member_permissions_discord_id_fkey" TO "guild_member_permissions_discord_id_fkey";
ALTER TABLE "guild_member_permissions" RENAME CONSTRAINT "team_member_permissions_guild_id_fkey" TO "guild_member_permissions_guild_id_fkey";
ALTER TABLE "guild_member_permissions" RENAME CONSTRAINT "team_member_permissions_granted_by_id_fkey" TO "guild_member_permissions_granted_by_id_fkey";

-- Update index names for guild_roles
ALTER INDEX "team_roles_guild_id_idx" RENAME TO "guild_roles_guild_id_idx";
ALTER INDEX "team_roles_guild_id_discord_role_id_key" RENAME TO "guild_roles_guild_id_discord_role_id_key";
ALTER INDEX "team_roles_guild_id_name_key" RENAME TO "guild_roles_guild_id_name_key";

-- Update index names for guild_role_members
ALTER INDEX "team_role_members_discord_id_idx" RENAME TO "guild_role_members_discord_id_idx";
ALTER INDEX "team_role_members_team_role_id_idx" RENAME TO "guild_role_members_guild_role_id_idx";
ALTER INDEX "team_role_members_discord_id_team_role_id_key" RENAME TO "guild_role_members_discord_id_guild_role_id_key";

-- Update index names for guild_member_permissions
ALTER INDEX "team_member_permissions_discord_id_idx" RENAME TO "guild_member_permissions_discord_id_idx";
ALTER INDEX "team_member_permissions_guild_id_idx" RENAME TO "guild_member_permissions_guild_id_idx";
ALTER INDEX "team_member_permissions_discord_id_guild_id_key" RENAME TO "guild_member_permissions_discord_id_guild_id_key";

-- Update sequence names
ALTER SEQUENCE "team_roles_id_seq" RENAME TO "guild_roles_id_seq";
ALTER SEQUENCE "team_role_members_id_seq" RENAME TO "guild_role_members_id_seq";
ALTER SEQUENCE "team_member_permissions_id_seq" RENAME TO "guild_member_permissions_id_seq";

-- Rename panel_team_roles table
ALTER TABLE "panel_team_roles" RENAME TO "panel_guild_roles";

-- Update foreign key constraint names for panel_guild_roles
ALTER TABLE "panel_guild_roles" RENAME CONSTRAINT "panel_team_roles_panel_id_fkey" TO "panel_guild_roles_panel_id_fkey";
ALTER TABLE "panel_guild_roles" RENAME CONSTRAINT "panel_team_roles_team_role_id_fkey" TO "panel_guild_roles_guild_role_id_fkey";

-- Update index names for panel_guild_roles
ALTER INDEX "panel_team_roles_panel_id_idx" RENAME TO "panel_guild_roles_panel_id_idx";
ALTER INDEX "panel_team_roles_team_role_id_idx" RENAME TO "panel_guild_roles_guild_role_id_idx";
ALTER INDEX "panel_team_roles_panel_id_team_role_id_key" RENAME TO "panel_guild_roles_panel_id_guild_role_id_key";

-- Update sequence name
ALTER SEQUENCE "panel_team_roles_id_seq" RENAME TO "panel_guild_roles_id_seq";