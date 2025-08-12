import { Command } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { BotContext } from "@bot/lib/context";

export type PermissionProvider = {
  getUserPermissions(guildId: string, userId: string): Promise<bigint> | bigint;
};

let permissionProvider: PermissionProvider | null = null;

export function configurePermissionProvider(provider: PermissionProvider) {
  permissionProvider = provider;
}

export abstract class BaseCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    let permissions = 0n;

    if (interaction.guild && permissionProvider) {
      permissions = await permissionProvider.getUserPermissions(
        interaction.guild.id,
        interaction.user.id
      );
    }

    const context: BotContext = {
      userId: interaction.user.id,
      username: interaction.user.username,
      guildId: interaction.guild ? interaction.guild.id : "",
      channelId: interaction.channelId ? interaction.channelId : undefined,
      permissions,
      locale: interaction.locale,
    };

    return BotContext.provideAsync(context, () => this.chatInputRunWithContext(interaction));
  }

  public abstract chatInputRunWithContext(
    interaction: ChatInputCommandInteraction
  ): Promise<unknown>;
}
