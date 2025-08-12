import { Command } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { BotContext } from "@bot/lib/context";

export abstract class BaseCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {

    const context: BotContext = {
      userId: interaction.user.id,
      username: interaction.user.username,
      guildId: interaction.guild ? interaction.guild.id : "",
      channelId: interaction.channelId ? interaction.channelId : undefined,
      locale: interaction.locale,
    };

    return BotContext.provideAsync(context, () => this.chatInputRunWithContext(interaction));
  }

  public abstract chatInputRunWithContext(
    interaction: ChatInputCommandInteraction
  ): Promise<unknown>;
}
