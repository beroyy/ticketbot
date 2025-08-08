import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { parseDiscordId, DefaultRolePermissions } from "@ticketsbot/core";
import { prisma } from "@ticketsbot/db";

export const GuildCreateListener = ListenerFactory.on("guildCreate", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  try {
    const guildId = parseDiscordId(guild.id);
    const ownerId = parseDiscordId(guild.ownerId);

    // Fetch owner info first (Discord API call)
    const owner = await guild.fetchOwner();
    logger.info(`📋 Fetched owner information for ${owner.user.tag}`);

    // Wrap all DB operations in a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Ensure guild exists and is marked as installed
      await tx.guild.upsert({
        where: { id: guildId },
        update: {
          name: guild.name,
          botInstalled: true,
        },
        create: {
          id: guildId,
          name: guild.name,
          botInstalled: true,
        },
      });

      // 2. Ensure owner exists in user database
      await tx.discordUser.upsert({
        where: { id: ownerId },
        update: {
          username: owner.user.username,
          discriminator: owner.user.discriminator,
          avatarUrl: owner.user.displayAvatarURL(),
        },
        create: {
          id: ownerId,
          username: owner.user.username,
          discriminator: owner.user.discriminator,
          avatarUrl: owner.user.displayAvatarURL(),
        },
      });

      // 3. Create default team roles (admin, support, viewer)
      const adminRole = await tx.guildRole.upsert({
        where: {
          guildId_name: {
            guildId: guildId,
            name: "admin",
          },
        },
        update: {
          isDefault: true,
          permissions: DefaultRolePermissions.admin,
        },
        create: {
          guildId: guildId,
          name: "admin",
          color: "#5865F2",
          position: 100,
          isDefault: true,
          permissions: DefaultRolePermissions.admin,
        },
      });

      await tx.guildRole.upsert({
        where: {
          guildId_name: {
            guildId: guildId,
            name: "support",
          },
        },
        update: {
          isDefault: true,
          permissions: DefaultRolePermissions.support,
        },
        create: {
          guildId: guildId,
          name: "support",
          color: "#57F287",
          position: 50,
          isDefault: true,
          permissions: DefaultRolePermissions.support,
        },
      });

      await tx.guildRole.upsert({
        where: {
          guildId_name: {
            guildId: guildId,
            name: "viewer",
          },
        },
        update: {
          isDefault: true,
          permissions: DefaultRolePermissions.viewer,
        },
        create: {
          guildId: guildId,
          name: "viewer",
          color: "#99AAB5",
          position: 10,
          isDefault: true,
          permissions: DefaultRolePermissions.viewer,
        },
      });

      // 4. Assign owner to admin role
      await tx.guildRoleMember.upsert({
        where: {
          discordId_guildRoleId: {
            discordId: ownerId,
            guildRoleId: adminRole.id,
          },
        },
        update: {
          assignedAt: new Date(),
        },
        create: {
          discordId: ownerId,
          guildRoleId: adminRole.id,
          assignedById: null, // System assignment
        },
      });

      logger.info(`✅ Database setup completed for guild ${guild.name}`);
    });

    logger.info(
      `✅ Completed all setup for guild ${guild.name} - owner ${owner.user.tag} now has admin permissions`
    );
  } catch (error) {
    logger.error(`❌ Failed to complete setup for guild ${guild.name}:`, error);
  }
});