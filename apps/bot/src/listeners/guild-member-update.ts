import { ListenerFactory } from "@bot/lib/sapphire";
import { container } from "@sapphire/framework";

const ROLE_PREFIX = "Tickets ";

export const GuildMemberUpdateListener = ListenerFactory.on(
  "guildMemberUpdate",
  async (oldMember, newMember) => {
    try {
      // Handle partials
      if (oldMember.partial) await oldMember.fetch();
      if (newMember.partial) await newMember.fetch();

      // Find ticket role changes
      const addedRoles = newMember.roles.cache.filter(
        (role) => !oldMember.roles.cache.has(role.id) && role.name.startsWith(ROLE_PREFIX)
      );
      const removedRoles = oldMember.roles.cache.filter(
        (role) => !newMember.roles.cache.has(role.id) && role.name.startsWith(ROLE_PREFIX)
      );

      if (addedRoles.size === 0 && removedRoles.size === 0) return;

      // Event logging removed - TCN will handle this automatically
      // The database changes to guild_role_members will trigger notifications

      // Just log for debugging if needed
      if (addedRoles.size > 0) {
        container.logger.info(
          `Member ${newMember.user.tag} gained ${addedRoles.size} ticket role(s)`
        );
      }
      if (removedRoles.size > 0) {
        container.logger.info(
          `Member ${newMember.user.tag} lost ${removedRoles.size} ticket role(s)`
        );
      }
    } catch (error) {
      container.logger.error(`Failed to track role changes:`, error);
    }
  }
);
