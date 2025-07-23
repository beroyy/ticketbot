import { type User, type Guild, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createEmbed, COLORS } from "@bot/lib/discord-utils";

interface TicketInfo {
  id: number;
  number: number;
  subject?: string | null;
}

// Constants
const RATING_EMOJIS = ["⚡", "💫", "✨", "🌟", "⭐"] as const;

// Helper functions
const getRatingEmoji = (rating: number) => RATING_EMOJIS[rating - 1] || "⭐";

const getRatingStyle = (rating: number): ButtonStyle => {
  if (rating >= 4) return ButtonStyle.Success;
  if (rating === 3) return ButtonStyle.Primary;
  return ButtonStyle.Secondary;
};

const getRatingColor = (rating: number) => {
  if (rating >= 4) return COLORS.SUCCESS;
  if (rating === 3) return COLORS.WARNING;
  return COLORS.ERROR;
};

// Feedback operations namespace
export const FeedbackOps = {
  send: {
    request: async (user: User, ticket: TicketInfo, guildName: string): Promise<boolean> => {
      try {
        const subject = ticket.subject ? ` (${ticket.subject})` : "";
        const embed = createEmbed({
          title: "Ticket Closed - Feedback Request",
          description: `Your ticket #${ticket.number}${subject} has been closed in **${guildName}**.How would you rate your support experience?`,
          color: COLORS.PRIMARY,
        });

        const buttons = FeedbackOps.create.buttons(ticket.id);

        await user.send({ embeds: [embed], components: [buttons.toJSON()] });
        return true;
      } catch (error) {
        console.error("Error sending feedback DM:", error);
        return false;
      }
    },

    notification: async (
      guild: Guild,
      channelId: string,
      ticket: TicketInfo,
      rating: number,
      userId: string
    ): Promise<boolean> => {
      try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) return false;

        const emoji = getRatingEmoji(rating);
        const embed = createEmbed({
          title: "Feedback Received",
          description: `Ticket #${ticket.number} received a ${emoji} (${rating}/5) rating from <@${userId}>`,
          color: getRatingColor(rating),
          footer: `Ticket ID: ${ticket.id}`,
          timestamp: true,
        });

        await channel.send({ embeds: [embed] });
        return true;
      } catch (error) {
        console.error("Error sending feedback notification:", error);
        return false;
      }
    },
  },

  create: {
    buttons: (ticketId: number) => {
      const buttons = [1, 2, 3, 4, 5].map((rating) =>
        new ButtonBuilder()
          .setCustomId(`feedback_${ticketId}_${rating}`)
          .setEmoji(getRatingEmoji(rating))
          .setStyle(getRatingStyle(rating))
      );

      return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
    },

    confirmationEmbed: (rating: number) => {
      const emoji = getRatingEmoji(rating);
      return createEmbed({
        title: "Thank You for Your Feedback!",
        description: `You rated your support experience ${emoji} (${rating}/5).Your feedback helps us improve our support quality.`,
        color: COLORS.SUCCESS,
      });
    },
  },
} as const;
