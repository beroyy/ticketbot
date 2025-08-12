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
import { createEmbed, COLORS } from "@bot/lib/utils";

type PanelData = {
  id: number;
  title: string;
  message: string;
  buttonLabel?: string | null;
  buttonEmoji?: string | null;
  buttonColor?: string | null;
};

type FormField = {
  id: number;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
};

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

// Panel embed operations
export const embed = {
  create: (panel: PanelData) =>
    createEmbed({
      title: panel.title,
      description: panel.message,
      color: COLORS.PRIMARY,
      footer: "Click the button below to create a ticket",
    }),
};

// Panel button operations
export const button = {
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
};

// Panel modal operations
export const modal = {
  create: (panelId: number, panelTitle: string, formFields: FormField[]) => {
    const modal = new ModalBuilder().setCustomId(`panel_form_${panelId}`).setTitle(panelTitle);

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
          return null;
        }
      })
      .filter((response): response is { fieldId: number; value: string } => response !== null),
};

// Deploy panel to channel
export const deploy = async (channel: TextChannel, panel: PanelData) => {
  const embedMessage = embed.create(panel);
  const buttonRow = button.create(panel);

  await channel.send({
    embeds: [embedMessage],
    components: [buttonRow.toJSON()],
  });
};
