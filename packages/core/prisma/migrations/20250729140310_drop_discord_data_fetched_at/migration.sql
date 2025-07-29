/*
  Warnings:

  - You are about to drop the column `discordDataFetchedAt` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "guild_member_permissions" RENAME CONSTRAINT "team_member_permissions_pkey" TO "guild_member_permissions_pkey";

-- AlterTable
ALTER TABLE "guild_role_members" RENAME CONSTRAINT "team_role_members_pkey" TO "guild_role_members_pkey";

-- AlterTable
ALTER TABLE "guild_roles" RENAME CONSTRAINT "team_roles_pkey" TO "guild_roles_pkey";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "discordDataFetchedAt";
