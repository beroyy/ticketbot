import type {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  InteractionReplyOptions,
  InteractionEditReplyOptions,
} from "discord.js";
import { Embed } from "@bot/lib/utils/embed-helpers";
import { EPHEMERAL_FLAG } from "@bot/lib/utils/constants";

type Interaction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | ModalSubmitInteraction
  | StringSelectMenuInteraction;

// Helper to determine reply method
const replyOrFollowUp = (interaction: Interaction, options: InteractionReplyOptions) =>
  interaction.deferred || interaction.replied
    ? interaction.followUp(options)
    : interaction.reply(options);

// Forward declaration to avoid circular reference
const InteractionEdit: typeof InteractionEditImpl = {} as typeof InteractionEditImpl;

// Main response namespace
export const InteractionResponse = {
  // Generic reply method
  reply: (interaction: Interaction, options: InteractionReplyOptions) =>
    replyOrFollowUp(interaction, options),

  error: (interaction: Interaction, message: string, ephemeral = true) =>
    replyOrFollowUp(interaction, {
      embeds: [Embed.error("❌ Error", message)],
      flags: ephemeral ? EPHEMERAL_FLAG : undefined,
    }),

  success: (interaction: Interaction, message: string, ephemeral = false) =>
    replyOrFollowUp(interaction, {
      embeds: [Embed.success("✅ Success", message)],
      flags: ephemeral ? EPHEMERAL_FLAG : undefined,
    }),

  info: (interaction: Interaction, message: string, ephemeral = false) =>
    replyOrFollowUp(interaction, {
      embeds: [Embed.info("ℹ️ Information", message)],
      flags: ephemeral ? EPHEMERAL_FLAG : undefined,
    }),

  warning: (interaction: Interaction, message: string, ephemeral = true) =>
    replyOrFollowUp(interaction, {
      embeds: [Embed.warning("⚠️ Warning", message)],
      flags: ephemeral ? EPHEMERAL_FLAG : undefined,
    }),

  processing: (interaction: Interaction, action = "Processing") =>
    replyOrFollowUp(interaction, {
      embeds: [Embed.info("⏳ Please wait", `${action}...`)],
      flags: EPHEMERAL_FLAG,
    }),

  permissionDenied: (interaction: Interaction, requiredPermission?: string) => {
    const message = requiredPermission
      ? `You need the **${requiredPermission}** permission to use this command.`
      : "You don't have permission to use this command.";
    return InteractionResponse.error(interaction, message);
  },

  notFound: (interaction: Interaction, resource: string) =>
    InteractionResponse.error(interaction, `${resource} not found.`),

  validationError: (interaction: Interaction, field: string, message: string) =>
    InteractionResponse.error(interaction, `**${field}**: ${message}`),

  unexpectedError: (interaction: Interaction) =>
    InteractionResponse.error(
      interaction,
      "An unexpected error occurred. Please try again later or contact support if the issue persists."
    ),
} as const;

// Edit response namespace implementation
const InteractionEditImpl = {
  // Generic edit method
  edit: (interaction: Interaction, options: InteractionEditReplyOptions) =>
    interaction.editReply(options),

  success: (interaction: Interaction, message: string) =>
    interaction.editReply({ embeds: [Embed.success("✅ Success", message)] }),

  error: (interaction: Interaction, message: string) =>
    interaction.editReply({ embeds: [Embed.error("❌ Error", message)] }),

  info: (interaction: Interaction, message: string) =>
    interaction.editReply({ embeds: [Embed.info("ℹ️ Information", message)] }),

  warning: (interaction: Interaction, message: string) =>
    interaction.editReply({ embeds: [Embed.warning("⚠️ Warning", message)] }),
} as const;

// Assign the implementation
Object.assign(InteractionEdit, InteractionEditImpl);

// Export for use
export { InteractionEdit };
