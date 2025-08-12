import type { Guild } from "discord.js";
import { container } from "@sapphire/framework";
import { db } from "@ticketsbot/db";
import { ChannelOps } from "./channel";
import { MessageOps } from "./message";
import { TranscriptOps } from "./transcript";

type TicketCreationOptions = {
  panelId: number;
  userId: string;
  username: string;
  guild: Guild;
  formResponses?: Array<{ fieldId: number; value: string }>;
};

type TicketCreationResult = {
  ticket: {
    id: number;
    number: number;
    openerId: string;
    subject?: string | null;
  };
  channelId?: string;
};

/**
 * Ticket-related Discord operations
 */
export const TicketOps = {
  /**
   * Creates a ticket from a panel with all necessary Discord operations
   */
  createFromPanel: async (options: TicketCreationOptions): Promise<TicketCreationResult> => {
    const { panelId, userId, username, guild, formResponses } = options;

    let channelId: string | undefined;

    const panel = await db.panel.getWithForm(panelId);
    if (!panel) {
      throw new Error("Panel not found");
    }

    const settings = await db.guild.getSettings(guild.id);
    if (!settings) {
      throw new Error("Guild not properly configured");
    }

    const ticket = await db.ticket.create({
      guildId: guild.id,
      channelId: "", // updated after channel creation
      openerId: userId,
      subject: panel.title,
      panelId,
      metadata: {
        createdVia: "discord",
        username,
        formResponses,
      },
    });

    try {
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

      await db.ticket.updateChannelId(ticket.id, channel.id);

      const ticketWithDetails = await db.ticket.getById(ticket.id);

      const welcomeEmbed = MessageOps.ticket.welcomeEmbed(ticketWithDetails, panel);
      const actionButtons = MessageOps.ticket.actionButtons(settings.showClaimButton);

      const welcomeMessage = await channel.send({
        embeds: [welcomeEmbed],
        components: [actionButtons.toJSON()],
      });

      await TranscriptOps.store.botMessage(welcomeMessage, { id: ticket.id });
    } catch (error) {
      container.logger.error("Error in Discord operations:", error);
    }

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
