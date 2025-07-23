import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import { domainEvents, type DomainEventData } from "@bot/lib/domain-events";
import { Embed } from "@bot/lib/discord-utils";
import { createLogChannelSender } from "@bot/lib/discord-operations";

const logTicketClosed = createLogChannelSender("ticket.closed");

const handleTicketClosed = async (event: DomainEventData<"ticket.closed">) => {
  // Create log embed
  const embed = Embed.error(
    "🔒 Ticket Closed",
    `**Ticket:** #${event.ticketNumber}
**Closed by:** <@${event.closedById}>
${event.reason ? `**Reason:** ${event.reason}` : ""}`
  );

  // Send to log channel
  await logTicketClosed(event.guildId, embed);
};

export const TicketClosedListener = ListenerFactory.once("ready", () => {
  // Register domain event listener
  domainEvents.on("ticket.closed", handleTicketClosed);
  container.logger.info("Ticket closed event listener registered");
});
