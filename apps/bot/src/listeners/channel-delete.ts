import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import { BotContext } from "@bot/lib/context";
import { db } from "@ticketsbot/db";

export const ChannelDeleteListener = ListenerFactory.on("channelDelete", async (channel) => {
  // Type guard to ensure it's a guild channel
  if (!("guild" in channel) || !channel.guild) return;
  if (!channel.isTextBased()) return;

  try {
    // Use static method to avoid context overhead
    const ticket = await db.ticket.get(channel.id);

    // Early return if no ticket found or already closed
    if (!ticket) {
      container.logger.debug(`No ticket found for deleted channel ${channel.id}`);
      return;
    }

    if (ticket.status === "CLOSED") {
      container.logger.debug(`Ticket #${ticket.number} already closed, skipping`);
      return;
    }

    const context: BotContext = {
      userId: channel.client.user.id,
      username: channel.client.user.username,
      guildId: channel.guild.id,
      permissions: 0n,
    };

    await BotContext.provideAsync(context, async () => {
      try {
        // Close the ticket (this updates the ticket record and logs to Event table)
        await db.ticketLifecycle.close({
          ticketId: ticket.id,
          closedById: channel.client.user.id,
          reason: "Channel was deleted",
          deleteChannel: false, // Already deleted
          notifyOpener: false, // Can't notify since channel is gone
        });

        container.logger.info(`Auto-closed ticket #${ticket.number} due to channel deletion`);
      } catch (closeError: any) {
        // Handle "already closed" as success (idempotent operation)
        if (closeError?.message?.includes("already closed")) {
          container.logger.info(
            `Ticket #${ticket.number} was already closed by another operation (concurrent deletion handled gracefully)`
          );
          return;
        }

        // Re-throw other errors
        throw closeError;
      }
    });
  } catch (error) {
    // Distinguish between different error types for better debugging
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        container.logger.warn(`Channel deletion handler - ticket not found: ${error.message}`);
      } else if (error.message.includes("permission")) {
        container.logger.error(`Channel deletion handler - permission error: ${error.message}`);
      } else {
        container.logger.error(`Channel deletion handler - unexpected error:`, error);
      }
    } else {
      container.logger.error(`Channel deletion handler - unknown error type:`, error);
    }
  }
});
