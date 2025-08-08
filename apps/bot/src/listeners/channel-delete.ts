import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { container } from "@sapphire/framework";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";

export const ChannelDeleteListener = ListenerFactory.on("channelDelete", async (channel) => {
  // Type guard to ensure it's a guild channel
  if (!("guild" in channel) || !channel.guild) return;
  if (!channel.isTextBased()) return;

  try {
    const ticket = await Ticket.findByChannelId(channel.id);
    if (!ticket || ticket.status === "CLOSED") return;

    const actor: DiscordActor = {
      type: "discord_user",
      properties: {
        userId: channel.client.user.id,
        username: channel.client.user.username,
        guildId: channel.guild.id,
        permissions: 0n,
      },
    };

    await Actor.Context.provideAsync(actor, async () => {
      // Close the ticket (this updates the ticket record and logs to Event table)
      await TicketLifecycle.close({
        ticketId: ticket.id,
        closedById: channel.client.user.id,
        reason: "Channel was deleted",
        deleteChannel: false, // Already deleted
        notifyOpener: false, // Can't notify since channel is gone
      });
    });

    container.logger.info(`Auto-closed ticket #${ticket.number} due to channel deletion`);
  } catch (error) {
    container.logger.error(`Failed to handle channel deletion:`, error);
  }
});
