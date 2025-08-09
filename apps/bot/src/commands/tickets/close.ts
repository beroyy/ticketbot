import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { ChannelOps, MessageOps } from "@bot/lib/discord-operations";
import { InteractionResponse, type Result, ok, TicketValidation } from "@bot/lib/discord-utils";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { getSettingsUnchecked } from "@ticketsbot/core/domains/guild";
import { prisma } from "@ticketsbot/db";
import type { ChatInputCommandInteraction, TextChannel } from "discord.js";

export class CloseCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "close",
      description: "Close the current support ticket",
      preconditions: ["guild-only", "ticket-channel-only", "can-close-ticket"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("close")
        .setDescription("Close the current support ticket")
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for closing the ticket")
            .setMaxLength(500)
            .setRequired(false)
        )
    );
  }

  protected override shouldDefer(): boolean {
    return true;
  }

  protected override deferEphemeral(): boolean {
    return true;
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any
  ): Promise<Result<{ ticketId: string }>> {
    const reason = interaction.options.getString("reason");
    const reasonResult = TicketValidation.closeReason(reason);

    if (!reasonResult.ok) {
      await InteractionResponse.error(interaction, reasonResult.error);
      return reasonResult;
    }

    const guild = interaction.guild!;
    const userId = interaction.user.id;

    let _channelDeleted = false;

    // Close ticket in transaction
    const closedTicket = await prisma.$transaction(async (_tx) => {
      // Close ticket using lifecycle domain
      return await TicketLifecycle.close({
        ticketId: ticket.id,
        closedById: userId,
        reason: reasonResult.value ?? undefined,
        deleteChannel: false, // We'll handle channel deletion separately
        notifyOpener: true,
      });
    });

    // Get guild settings
    const settings = await getSettingsUnchecked(guild.id);

    // Discord operations after transaction
    try {
      const channel = (await guild.channels
        .fetch(interaction.channelId!)
        .catch(() => null)) as TextChannel | null;

      if (channel) {
        // Send closed embed before deleting/archiving
        const closedEmbed = MessageOps.ticket.closedEmbed(userId, ticket.id);
        await channel.send({ embeds: [closedEmbed] }).catch(console.error);

        // Archive or delete the channel
        const archiveResult = await ChannelOps.ticket.archive(channel, guild, settings, userId);
        _channelDeleted = archiveResult.deleted;
      }
    } catch (error) {
      console.error("Failed to handle Discord channel operations:", error);
    }

    await InteractionResponse.success(
      interaction,
      `✅ **Ticket Closed**\nThis ticket has been closed successfully.${reasonResult.value ? `\n**Reason:** ${reasonResult.value}` : ""}`
    );

    return ok({ ticketId: closedTicket.id.toString() });
  }
}
