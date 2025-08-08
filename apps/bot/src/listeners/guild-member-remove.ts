import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { Role as RoleDomain } from "@ticketsbot/core/domains/role";
import { Event } from "@ticketsbot/core/domains/event";
import { removeParticipantFromAll } from "@ticketsbot/core/domains/ticket";
import { container } from "@sapphire/framework";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";

export const GuildMemberRemoveListener = ListenerFactory.on("guildMemberRemove", async (member) => {
  try {
    if (member.partial) await member.fetch();

    const actor: DiscordActor = {
      type: "discord_user",
      properties: {
        userId: member.client.user.id,
        username: member.client.user.username,
        guildId: member.guild.id,
        permissions: 0n,
      },
    };

    await Actor.Context.provideAsync(actor, async () => {
      // Remove from guild roles (business logic)
      const removedCount = await RoleDomain.removeAllRoles(member.guild.id, member.id);

      // Remove from ticket participants (business logic)
      const affectedTickets = await removeParticipantFromAll(member.guild.id, member.id);

      // Log event if they had roles or tickets
      if (removedCount > 0 || affectedTickets > 0) {
        await Event.create({
          guildId: member.guild.id,
          actorId: member.id,
          category: "MEMBER",
          action: "member.left",
          targetType: "USER",
          targetId: member.id,
          metadata: {
            username: member.user.username,
            rolesRemoved: removedCount,
            ticketsAffected: affectedTickets,
          },
        });
      }
    });
  } catch (error) {
    container.logger.error(`Failed to handle member removal:`, error);
  }
});
