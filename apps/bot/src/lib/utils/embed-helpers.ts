import { EmbedBuilder } from "discord.js";
import { COLORS } from "@bot/lib/utils/colors";

// Configuration interface for custom colors
export interface EmbedColors {
  primary: number;
  success: number;
  warning: number;
  error: number;
  info: number;
}

// Default colors from centralized constants
export const DEFAULT_COLORS: EmbedColors = {
  primary: COLORS.PRIMARY,
  success: COLORS.SUCCESS,
  warning: COLORS.WARNING,
  error: COLORS.ERROR,
  info: COLORS.INFO,
};

// Factory to create embed helpers with custom colors
export const createEmbedHelpers = (colors: EmbedColors = DEFAULT_COLORS) => {
  // Base embed builder with common defaults
  const baseEmbed = (title: string, description = "", color: number) =>
    new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();

  return {
    primary: (title: string, description?: string) => baseEmbed(title, description, colors.primary),

    success: (title: string, description?: string) => baseEmbed(title, description, colors.success),

    error: (title: string, description?: string) => baseEmbed(title, description, colors.error),

    info: (title: string, description?: string) => baseEmbed(title, description, colors.info),

    warning: (title: string, description?: string) => baseEmbed(title, description, colors.warning),

    // Builder pattern for complex embeds
    builder: () => new EmbedBuilder().setTimestamp(),

    // Modifier functions
    withGuildFooter: (embed: EmbedBuilder, guildName: string, guildIcon?: string | null) =>
      embed.setFooter({
        text: guildName,
        iconURL: guildIcon || undefined,
      }),

    withAuthor: (embed: EmbedBuilder, name: string, iconURL?: string, url?: string) =>
      embed.setAuthor({ name, iconURL, url }),

    withFields: (
      embed: EmbedBuilder,
      fields: Array<{ name: string; value: string; inline?: boolean }>
    ) => embed.addFields(fields),
  } as const;
};

// Default embed helpers with standard colors
export const Embed = createEmbedHelpers();
