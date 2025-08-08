import type { Guild } from "discord.js";
import { container } from "@sapphire/framework";
import { Panel } from "@ticketsbot/core/domains/panel";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { getSettingsUnchecked } from "@ticketsbot/core/domains/guild";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
import { ChannelOps } from "./channel";
import { MessageOps } from "./message";
import { TranscriptOps } from "./transcript";

interface TicketCreationOptions {
  panelId: number;
  userId: string;
  username: string;
  guild: Guild;
  formResponses?: Array<{ fieldId: number; value: string }>;
}

interface TicketCreationResult {
  ticket: {
    id: number;
    number: number;
    openerId: string;
    subject?: string | null;
  };
  channelId?: string;
}

/**
 * Ticket-related Discord operations
 */
export const TicketOps = {
  /**
   * Creates a ticket from a panel with all necessary Discord operations
   * This is the shared logic used by both panel form modal and panel select menu
   */
  createFromPanel: async (options: TicketCreationOptions): Promise<TicketCreationResult> => {
    const { panelId, userId, username, guild, formResponses } = options;

    let ticket: any;
    let channelId: string | undefined;

    await withTransaction(async () => {
      // Get panel details first
      const panel = await Panel.getWithForm(panelId);
      if (!panel) {
        throw new Error("Panel not found");
      }

      // Create ticket using lifecycle domain
      ticket = await TicketLifecycle.create({
        guildId: guild.id,
        channelId: "", // Will be updated after channel creation
        openerId: userId,
        subject: panel.title,
        panelId,
        metadata: {
          createdVia: "discord",
          username,
          formResponses,
        },
      });

      // Get guild settings
      const settings = await getSettingsUnchecked(guild.id);
      if (!settings) {
        throw new Error("Guild not properly configured");
      }

      // Schedule Discord operations after transaction
      afterTransaction(async () => {
        try {
          // Create Discord channel
          const channel = await ChannelOps.ticket.createWithPermissions(
            guild,
            {
              id: ticket.id,
              number: ticket.number,
              openerId: ticket.openerId,
              subject: ticket.subject,
            },
            panel
          );

          channelId = channel.id;

          // Update ticket with channel ID
          await Ticket.updateChannelId(ticket.id, channel.id);

          // Get ticket with form responses
          const ticketWithDetails = await Ticket.getById(ticket.id);

          // Send welcome message
          const welcomeEmbed = MessageOps.ticket.welcomeEmbed(ticketWithDetails, panel);
          const actionButtons = MessageOps.ticket.actionButtons(settings.showClaimButton);

          const welcomeMessage = await channel.send({
            embeds: [welcomeEmbed],
            components: [actionButtons.toJSON()],
          });

          // Store welcome message in transcript
          await TranscriptOps.store.botMessage(welcomeMessage, { id: ticket.id });
        } catch (error) {
          container.logger.error("Error in Discord operations:", error);
          throw error;
        }
      });
    });

    return { ticket, channelId };
  },

  /**
   * Parses form responses from a modal interaction
   */
  parseFormResponses: (
    interaction: { fields: { getTextInputValue: (key: string) => string } },
    formFields: Array<{ id: number }>
  ): Array<{ fieldId: number; value: string }> => {
    const formResponses: Array<{ fieldId: number; value: string }> = [];

    for (const field of formFields) {
      try {
        const fieldValue = interaction.fields.getTextInputValue(`field_${field.id}`);
        if (fieldValue) {
          formResponses.push({
            fieldId: field.id,
            value: fieldValue,
          });
        }
      } catch (_error) {
        container.logger.debug(`Field ${field.id} not found in form submission`);
      }
    }

    return formResponses;
  },
} as const;
