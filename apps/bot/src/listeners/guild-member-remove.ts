import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import { prisma } from "@ticketsbot/db";

export const GuildMemberRemoveListener = ListenerFactory.on("guildMemberRemove", async (member) => {
  try {
    if (member.partial) await member.fetch();

    const guildId = member.guild.id;
    const userId = member.id;

    // Wrap all operations in a transaction for consistency
    await prisma.$transaction(async (tx) => {
      // 1. Remove all roles from member
      const removedRoles = await tx.guildRoleMember.deleteMany({
        where: {
          discordId: userId,
          guildRole: {
            guildId: guildId,
          },
        },
      });

      // 2. Remove from all ticket participants
      const removedFromTickets = await tx.ticketParticipant.deleteMany({
        where: {
          userId: userId,
          ticket: {
            guildId: guildId,
            status: {
              in: ["OPEN", "CLAIMED"],
            },
          },
        },
      });

      // 3. Unclaim any tickets they had claimed
      const unclaimedTickets = await tx.ticket.updateMany({
        where: {
          guildId: guildId,
          claimedById: userId,
          status: "CLAIMED",
        },
        data: {
          status: "OPEN",
          claimedById: null,
        },
      });

      // 4. Log event IN transaction for consistency
      if (removedRoles.count > 0 || removedFromTickets.count > 0 || unclaimedTickets.count > 0) {
        await tx.event.create({
          data: {
            guildId: guildId,
            actorId: userId,
            category: "MEMBER",
            action: "member.left",
            targetType: "USER",
            targetId: userId,
            metadata: {
              username: member.user.username,
              rolesRemoved: removedRoles.count,
              ticketsAffected: removedFromTickets.count,
              ticketsUnclaimed: unclaimedTickets.count,
            },
          },
        });

        container.logger.info(
          `Member ${member.user.username} removed from guild ${member.guild.name}: ` +
          `${removedRoles.count} roles removed, ${removedFromTickets.count} tickets affected, ` +
          `${unclaimedTickets.count} tickets unclaimed`
        );
      }
    });
  } catch (error) {
    container.logger.error(`Failed to handle member removal:`, error);
  }
});