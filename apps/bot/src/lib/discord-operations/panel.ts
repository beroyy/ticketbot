import {
  type TextChannel,
  type ModalSubmitInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { createEmbed, COLORS } from "@bot/lib/discord-utils";

interface PanelData {
  id: number;
  title: string;
  message: string;
  buttonLabel?: string | null;
  buttonEmoji?: string | null;
  buttonColor?: string | null;
}

interface FormField {
  id: number;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
}

// Get button style from color string
const getButtonStyle = (color?: string | null): ButtonStyle => {
  const colorMap: Record<string, ButtonStyle> = {
    primary: ButtonStyle.Primary,
    blurple: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    grey: ButtonStyle.Secondary,
    gray: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    green: ButtonStyle.Success,
    danger: ButtonStyle.Danger,
    red: ButtonStyle.Danger,
  };

  return colorMap[color?.toLowerCase() ?? ""] ?? ButtonStyle.Primary;
};

// Panel operations namespace
export const PanelOps = {
  embed: {
    create: (panel: PanelData) =>
      createEmbed({
        title: panel.title,
        description: panel.message,
        color: COLORS.PRIMARY,
        footer: "Click the button below to create a ticket",
      }),
  },

  button: {
    create: (panel: PanelData) => {
      const button = new ButtonBuilder()
        .setCustomId(`create_ticket_${panel.id}`)
        .setLabel(panel.buttonLabel || "Create Ticket")
        .setStyle(getButtonStyle(panel.buttonColor));

      if (panel.buttonEmoji) {
        button.setEmoji(panel.buttonEmoji);
      }

      return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    },
  },

  modal: {
    create: (panelId: number, panelTitle: string, formFields: FormField[]) => {
      const modal = new ModalBuilder().setCustomId(`panel_form_${panelId}`).setTitle(panelTitle);

      // Discord modals support up to 5 text inputs
      const fieldsToShow = formFields.slice(0, 5);

      fieldsToShow.forEach((field) => {
        const textInput = new TextInputBuilder()
          .setCustomId(`field_${field.id}`)
          .setLabel(field.label)
          .setStyle(field.type === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(field.required);

        if (field.placeholder) {
          textInput.setPlaceholder(field.placeholder);
        }

        const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
        modal.addComponents(actionRow);
      });

      return modal;
    },

    parseResponses: (interaction: ModalSubmitInteraction, formFields: FormField[]) =>
      formFields
        .map((field) => {
          try {
            const value = interaction.fields.getTextInputValue(`field_${field.id}`);
            return value ? { fieldId: field.id, value } : null;
          } catch {
            return null; // Field might not be present if optional
          }
        })
        .filter((response): response is { fieldId: number; value: string } => response !== null),
  },

  deploy: async (channel: TextChannel, panel: PanelData) => {
    const embed = PanelOps.embed.create(panel);
    const button = PanelOps.button.create(panel);

    await channel.send({
      embeds: [embed],
      components: [button.toJSON()],
    });
  },
} as const;
