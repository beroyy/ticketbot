import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { Event, Ticket } from "@ticketsbot/core/domains";
import { TranscriptOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";
import type { Message } from "discord.js";

const ROLE_PREFIX = "Tickets ";

export const MessageCreateListener = ListenerFactory.on(
  "messageCreate",
  async (message: Message) => {
    if (message.system || !message.guild) return;

    try {
      // Check if this is a ticket channel
      const ticket = await Ticket.findByChannelId(message.channelId);
      if (!ticket || ticket.status === "CLOSED") return;

      const actor: DiscordActor = {
        type: "discord_user",
        properties: {
          userId: message.client.user.id,
          username: message.client.user.username,
          guildId: message.guildId!,
          permissions: 0n,
        },
      };

      await Actor.Context.provideAsync(actor, async () => {
        // Store ALL messages in transcripts
        if (message.author.bot) {
          await TranscriptOps.store.botMessage(message, ticket);
        } else {
          await TranscriptOps.store.userMessage(message);
        }

        // Log non-bot messages as events for activity tracking
        if (!message.author.bot) {
          // Determine message type
          const member = message.member || await message.guild!.members.fetch(message.author.id).catch(() => null);
          const hasTicketRole = member?.roles.cache.some(role => role.name.startsWith(ROLE_PREFIX)) ?? false;
          const messageType = hasTicketRole ? "staff" : "customer";

          await Event.create({
            guildId: message.guildId!,
            actorId: message.author.id,
            category: "TICKET",
            action: `message.${messageType}_sent`,
            targetType: "TICKET",
            targetId: ticket.id.toString(),
            ticketId: ticket.id,
            metadata: {
              messageId: message.id,
              ticketNumber: ticket.number,
              messageLength: message.content.length,
              hasAttachments: message.attachments.size > 0,
            }
          });
        }
      });
    } catch (error) {
      container.logger.error(`Failed to handle message in ticket ${message.channelId}:`, error);
    }
  }
);
