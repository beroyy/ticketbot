import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { Event } from "@ticketsbot/core/domains";
import { container } from "@sapphire/framework";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";

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
        role => !oldMember.roles.cache.has(role.id) && role.name.startsWith(ROLE_PREFIX)
      );
      const removedRoles = oldMember.roles.cache.filter(
        role => !newMember.roles.cache.has(role.id) && role.name.startsWith(ROLE_PREFIX)
      );

      if (addedRoles.size === 0 && removedRoles.size === 0) return;

      const actor: DiscordActor = {
        type: "discord_user",
        properties: {
          userId: newMember.client.user.id,
          username: newMember.client.user.username,
          guildId: newMember.guild.id,
          permissions: 0n,
        },
      };

      await Actor.Context.provideAsync(actor, async () => {
        // Log role additions
        for (const [, role] of addedRoles) {
          await Event.create({
            guildId: newMember.guild.id,
            actorId: newMember.id,
            category: "TEAM",
            action: "role.assigned",
            targetType: "ROLE",
            targetId: role.id,
            metadata: {
              roleName: role.name,
              userId: newMember.id,
              roleColor: role.hexColor,
            }
          });
        }

        // Log role removals
        for (const [, role] of removedRoles) {
          await Event.create({
            guildId: newMember.guild.id,
            actorId: newMember.id,
            category: "TEAM",
            action: "role.removed",
            targetType: "ROLE",
            targetId: role.id,
            metadata: {
              roleName: role.name,
              userId: newMember.id,
            }
          });
        }
      });
    } catch (error) {
      container.logger.error(`Failed to track role changes:`, error);
    }
  }
);