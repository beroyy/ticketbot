import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import { db } from "@ticketsbot/db";

export const GuildMemberRemoveListener = ListenerFactory.on("guildMemberRemove", async (member) => {
  try {
    if (member.partial) await member.fetch();

    const guildId = member.guild.id;
    const userId = member.id;

    // Use high-level guild cleanup operation
    const result = await db.guild.cleanupMember(guildId, userId);
    
    if (result.rolesRemoved > 0 || result.ticketsAffected > 0 || result.ticketsUnclaimed > 0) {
      container.logger.info(
        `Member ${member.user.username} removed from guild ${member.guild.name}: ` +
        `${result.rolesRemoved} roles removed, ${result.ticketsAffected} tickets affected, ` +
        `${result.ticketsUnclaimed} tickets unclaimed`
      );
    }
  } catch (error) {
    container.logger.error(`Failed to handle member removal:`, error);
  }
});