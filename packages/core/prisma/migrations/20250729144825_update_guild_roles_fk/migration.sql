/*
  Warnings:

  - You are about to drop the column `team_role_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `team_role_id` on the `guild_role_members` table. All the data in the column will be lost.
  - The `status` column on the `guild_roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `team_role_id` on the `panel_guild_roles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[discord_id,guild_role_id]` on the table `guild_role_members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[panel_id,guild_role_id]` on the table `panel_guild_roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guild_role_id` to the `guild_role_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guild_role_id` to the `panel_guild_roles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GuildRoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_team_role_id_fkey";

-- DropForeignKey
ALTER TABLE "guild_role_members" DROP CONSTRAINT "guild_role_members_guild_role_id_fkey";

-- DropForeignKey
ALTER TABLE "panel_guild_roles" DROP CONSTRAINT "panel_guild_roles_guild_role_id_fkey";

-- DropIndex
DROP INDEX "events_team_role_id_created_at_idx";

-- DropIndex
DROP INDEX "guild_role_members_discord_id_guild_role_id_key";

-- DropIndex
DROP INDEX "guild_role_members_guild_role_id_idx";

-- DropIndex
DROP INDEX "panel_guild_roles_guild_role_id_idx";

-- DropIndex
DROP INDEX "panel_guild_roles_panel_id_guild_role_id_key";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "team_role_id",
ADD COLUMN     "guild_role_id" INTEGER;

-- AlterTable
ALTER TABLE "guild_role_members" DROP COLUMN "team_role_id",
ADD COLUMN     "guild_role_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "guild_roles" DROP COLUMN "status",
ADD COLUMN     "status" "GuildRoleStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "panel_guild_roles" RENAME CONSTRAINT "panel_team_roles_pkey" TO "panel_guild_roles_pkey";

ALTER TABLE "panel_guild_roles" DROP COLUMN "team_role_id",
ADD COLUMN     "guild_role_id" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "TeamRoleStatus";

-- CreateIndex
CREATE INDEX "events_guild_role_id_created_at_idx" ON "events"("guild_role_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "guild_role_members_guild_role_id_idx" ON "guild_role_members"("guild_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "guild_role_members_discord_id_guild_role_id_key" ON "guild_role_members"("discord_id", "guild_role_id");

-- CreateIndex
CREATE INDEX "panel_guild_roles_guild_role_id_idx" ON "panel_guild_roles"("guild_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "panel_guild_roles_panel_id_guild_role_id_key" ON "panel_guild_roles"("panel_id", "guild_role_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_guild_role_id_fkey" FOREIGN KEY ("guild_role_id") REFERENCES "guild_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_guild_roles" ADD CONSTRAINT "panel_guild_roles_guild_role_id_fkey" FOREIGN KEY ("guild_role_id") REFERENCES "guild_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_role_members" ADD CONSTRAINT "guild_role_members_guild_role_id_fkey" FOREIGN KEY ("guild_role_id") REFERENCES "guild_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
