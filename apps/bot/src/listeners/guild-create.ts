import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { ensure as ensureGuild, User, Role } from "@ticketsbot/core/domains";
import { parseDiscordId, Redis } from "@ticketsbot/core";

export const GuildCreateListener = ListenerFactory.on("guildCreate", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  try {
    // 1. Create guild record
    await ensureGuild(parseDiscordId(guild.id), guild.name, parseDiscordId(guild.ownerId));
    logger.info(`✅ Guild ${guild.name} added to database with owner ${guild.ownerId}`);

    // 2. Fetch owner info
    const owner = await guild.fetchOwner();
    logger.info(`📋 Fetched owner information for ${owner.user.tag}`);

    // 3. Ensure owner exists in user database
    await User.ensure(
      parseDiscordId(owner.id),
      owner.user.username,
      owner.user.discriminator,
      owner.user.displayAvatarURL()
    );
    logger.info(`👤 Ensured owner ${owner.user.tag} exists in database`);

    // 4. Create default team roles
    await Role.ensureDefaultRoles(parseDiscordId(guild.id));
    logger.info(`🎭 Created default team roles for guild ${guild.name}`);

    // 5. Assign owner to admin role
    const adminRole = await Role.getRoleByName(parseDiscordId(guild.id), "admin");
    if (adminRole) {
      await Role.assignRole(adminRole.id, parseDiscordId(owner.id));
      logger.info(`👑 Assigned admin role to guild owner ${owner.user.tag}`);
    }

    // 6. Add to bot guilds cache if Redis is available
    if (Redis.isAvailable()) {
      try {
        await Redis.withRetry(
          async (client) => client.sAdd("bot:guilds", guild.id),
          `guildCreate.addToCache(${guild.id})`
        );
        logger.info(`✅ Added guild ${guild.name} to bot guilds cache`);
      } catch (error) {
        logger.error(`❌ Failed to add guild to cache:`, error);
      }
    }

    logger.info(
      `✅ Completed setup for guild ${guild.name} - owner ${owner.user.tag} now has admin permissions`
    );
  } catch (error) {
    logger.error(`❌ Failed to complete setup for guild ${guild.name}:`, error);
  }
});
