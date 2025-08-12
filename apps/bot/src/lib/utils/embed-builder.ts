import { EmbedBuilder } from "discord.js";
import { COLORS } from "@bot/lib/utils/colors";

export interface EmbedOptions {
  title?: string;
  description?: string;
  color?: number;
  footer?: string;
  timestamp?: boolean;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  author?: {
    name: string;
    iconURL?: string;
    url?: string;
  };
  thumbnail?: string;
  image?: string;
}

/**
 * Create an embed from options
 */
export const createEmbed = (options: EmbedOptions): EmbedBuilder => {
  const embed = new EmbedBuilder();

  if (options.color !== undefined) {
    embed.setColor(options.color);
  }

  if (options.title) {
    embed.setTitle(options.title);
  }

  if (options.description) {
    embed.setDescription(options.description);
  }

  if (options.footer) {
    embed.setFooter({ text: options.footer });
  }

  if (options.timestamp) {
    embed.setTimestamp();
  }

  if (options.fields && options.fields.length > 0) {
    embed.addFields(options.fields);
  }

  if (options.author) {
    embed.setAuthor(options.author);
  }

  if (options.thumbnail) {
    embed.setThumbnail(options.thumbnail);
  }

  if (options.image) {
    embed.setImage(options.image);
  }

  return embed;
};

/**
 * Modifier function type for embed builder pattern
 */
export type EmbedModifier = (embed: EmbedBuilder) => EmbedBuilder;

/**
 * Compose embed modifiers using pipe pattern
 */
export const pipe =
  (...modifiers: EmbedModifier[]) =>
  (initial: EmbedBuilder = new EmbedBuilder()): EmbedBuilder => {
    return modifiers.reduce((embed, modifier) => modifier(embed), initial);
  };

// Alias for backwards compatibility
export const pipeEmbed = pipe;

/**
 * Conditional embed modifier
 */
export const when =
  (condition: boolean | (() => boolean), modifier: EmbedModifier): EmbedModifier =>
  (embed) => {
    const shouldApply = typeof condition === "function" ? condition() : condition;
    return shouldApply ? modifier(embed) : embed;
  };

// Alias for backwards compatibility
export const whenEmbed = when;

// Common embed modifiers
export const withTitle =
  (title: string): EmbedModifier =>
  (embed) =>
    embed.setTitle(title);

export const withDescription =
  (description: string): EmbedModifier =>
  (embed) =>
    embed.setDescription(description);

export const withField =
  (name: string, value: string, inline = false): EmbedModifier =>
  (embed) =>
    embed.addFields({ name, value, inline });

export const withTimestamp = (): EmbedModifier => (embed) => embed.setTimestamp();

export const withFooter =
  (text: string, iconURL?: string): EmbedModifier =>
  (embed) =>
    embed.setFooter({ text, iconURL });

export const withThumbnail =
  (url: string): EmbedModifier =>
  (embed) =>
    embed.setThumbnail(url);

// Color presets using centralized constants
export const withPrimaryColor = (): EmbedModifier => (embed) => embed.setColor(COLORS.PRIMARY);

export const withSuccessColor = (): EmbedModifier => (embed) => embed.setColor(COLORS.SUCCESS);

export const withWarningColor = (): EmbedModifier => (embed) => embed.setColor(COLORS.WARNING);

export const withErrorColor = (): EmbedModifier => (embed) => embed.setColor(COLORS.ERROR);

export const withInfoColor = (): EmbedModifier => (embed) => embed.setColor(COLORS.INFO);
