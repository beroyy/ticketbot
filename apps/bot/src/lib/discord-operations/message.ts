import {
  type User,
  type EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { createEmbed, COLORS } from "@bot/lib/discord-utils";

type TicketInfo = {
  id: number;
  number: number;
  openerId: string;
  subject?: string | null;
  panelId?: number | null;
  formResponses?: Array<{
    field: { label: string };
    value: string;
  }>;
};

type PanelInfo = {
  title: string;
  introTitle?: string | null;
  introMessage?: string | null;
  mentionRoles?: string | null;
  hideMentions?: boolean;
  textSections?: any;
};

export const MessageOps = {
  ticket: {
    welcomeEmbed: (ticket: TicketInfo, panel?: PanelInfo): EmbedBuilder => {
      const title = panel?.introTitle || "Support Ticket";
      const description =
        panel?.introMessage ||
        "Thank you for creating a support ticket. Our team will assist you as soon as possible.";

      const embed = createEmbed({
        title,
        description,
        color: COLORS.PRIMARY,
        footer: `Ticket ID: ${ticket.id}`,
      });

      if (ticket.subject) {
        embed.addFields({
          name: "Subject",
          value: ticket.subject,
          inline: false,
        });
      }

      if (ticket.formResponses && ticket.formResponses.length > 0) {
        for (const response of ticket.formResponses) {
          embed.addFields({
            name: response.field.label,
            value: `>>> ${response.value || "No response provided"}`,
            inline: false,
          });
        }
      }

      if (panel?.textSections) {
        try {
          const textSections = panel.textSections as Array<{ name: string; value: string }>;
          for (const section of textSections) {
            if (section.name && section.value) {
              embed.addFields({
                name: section.name,
                value: section.value,
                inline: false,
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse textSections:", e);
        }
      }

      return embed;
    },

    actionButtons: (showClaimButton = false) => {
      const buttons = [
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("🔒 Close")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("ticket_close_with_reason")
          .setLabel("🔒 Close With Reason")
          .setStyle(ButtonStyle.Danger),
      ];

      if (showClaimButton) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId("ticket_claim")
            .setLabel("🎯 Claim")
            .setStyle(ButtonStyle.Success)
        );
      }

      return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
    },

    closedEmbed: (closedBy: string, ticketId: number) =>
      createEmbed({
        title: "🔒 Ticket Closed",
        description: `Ticket closed by <@${closedBy}>`,
        color: COLORS.ERROR,
        footer: `Ticket ID: ${ticketId}`,
      }),
  },

  confirmation: {
    closeEmbed: () =>
      createEmbed({
        title: "Close Confirmation",
        description: "Please confirm that you want to close this ticket",
        color: COLORS.SUCCESS,
        footer: "Powered by discord.tickets",
      }),

    closeButton: () =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close_confirm")
          .setLabel("✔︎ Close")
          .setStyle(ButtonStyle.Primary)
      ),
  },

  feedback: {
    sendDM: async (user: User, ticket: TicketInfo, guildName: string): Promise<boolean> => {
      try {
        const embed = createEmbed({
          title: "Ticket Closed - Feedback Request",
          description: `Your ticket #${ticket.number} has been closed in **${guildName}**.How would you rate your support experience?`,
          color: COLORS.PRIMARY,
        });

        const buttons = [5, 4, 3, 2, 1].map((rating) =>
          new ButtonBuilder()
            .setCustomId(`feedback_${ticket.id}_${rating}`)
            .setEmoji(["⭐", "🌟", "✨", "💫", "⚡"][5 - rating] || "⭐")
            .setStyle(
              rating === 5
                ? ButtonStyle.Success
                : rating === 4
                  ? ButtonStyle.Primary
                  : rating === 1
                    ? ButtonStyle.Danger
                    : ButtonStyle.Secondary
            )
        );

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);

        await user.send({ embeds: [embed], components: [row.toJSON()] });
        return true;
      } catch (error) {
        console.error("Error sending feedback DM:", error);
        return false;
      }
    },

    successEmbed: (rating: number) => {
      const ratingEmojis = ["⚡", "💫", "✨", "🌟", "⭐"];
      const emoji = ratingEmojis[rating - 1] || "⭐";

      return createEmbed({
        title: "Thank You for Your Feedback!",
        description: `You rated this support ${emoji}`,
        color: COLORS.SUCCESS,
      });
    },
  },

  closeRequest: {
    approvedEmbed: (ticketId: number) =>
      createEmbed({
        title: "Ticket Closed",
        description:
          "Ticket closure approved by the opener. This channel will be deleted in a few seconds.",
        color: COLORS.ERROR,
        footer: `Ticket ID: ${ticketId}`,
      }),

    deniedMessage: () => "❌ Ticket closure request denied by the opener.",
  },

  claim: {
    successEmbed: (claimedBy: string, ticketId: number) =>
      createEmbed({
        title: "Ticket Claimed",
        description: `This ticket has been claimed by <@${claimedBy}>.`,
        color: COLORS.SUCCESS,
        footer: `Ticket ID: ${ticketId}`,
      }),
  },

  utils: {
    buildMentions: (mentionRoles: string | null, openerId: string): string => {
      if (!mentionRoles) return "";

      try {
        const roles = JSON.parse(mentionRoles) as string[];
        const mentions = roles.map((roleId) => {
          switch (roleId) {
            case "ticket-opener":
              return `<@${openerId}>`;
            case "here":
              return "@here";
            case "everyone":
              return "@everyone";
            default:
              return `<@&${roleId}>`;
          }
        });

        return mentions.length > 0 ? mentions.join(" ") + "" : "";
      } catch {
        return "";
      }
    },
  },
} as const;
