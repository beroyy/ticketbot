import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import { domainEvents, type DomainEventData } from "@bot/lib/domain-events";
import { Embed } from "@bot/lib/discord-utils";
import { createLogChannelSender } from "@bot/lib/discord-operations";

const logTicketCreated = createLogChannelSender("ticket.created");

const handleTicketCreated = async (event: DomainEventData<"ticket.created">) => {
  // Create log embed
  const embed = Embed.info(
    "📋 New Ticket Created",
    `**Ticket:** #${event.ticketNumber}
**Opened by:** <@${event.openerId}>
**Channel:** <#${event.channelId}>
${event.subject ? `**Subject:** ${event.subject}` : ""}
${event.panelId ? `**Panel ID:** ${event.panelId}` : ""}`
  );

  // Send to log channel
  await logTicketCreated(event.guildId, embed);
};

export const TicketCreatedListener = ListenerFactory.once("ready", () => {
  // Register domain event listener
  domainEvents.on("ticket.created", handleTicketCreated);
  container.logger.info("Ticket created event listener registered");
});
