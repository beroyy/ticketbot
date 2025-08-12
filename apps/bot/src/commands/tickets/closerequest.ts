import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import {
  Embed,
  InteractionResponse,
  type Result,
  err,
  ok,
  EPHEMERAL_FLAG,
} from "@bot/lib/discord-utils";
import { db } from "@ticketsbot/db";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { parseDiscordId } from "@ticketsbot/core";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
} from "discord.js";

export class CloseRequestCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "closerequest",
      description: "Request approval from the ticket opener to close the ticket",
      preconditions: ["guild-only", "team-only", "ticket-channel-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("closerequest")
        .setDescription("Request approval from the ticket opener to close the ticket")
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for requesting closure")
            .setMaxLength(200)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("delay")
            .setDescription("Hours to wait before auto-closing (0 for no auto-close)")
            .setMinValue(0)
            .setMaxValue(168) // 1 week max
            .setRequired(false)
        )
    );
  }

  protected override shouldDefer(): boolean {
    return false;
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any
  ): Promise<Result<void>> {
    const reason = interaction.options.getString("reason");
    const delay = interaction.options.getInteger("delay") || 0;

    const discordId = parseDiscordId(interaction.user.id);

    // Ensure user exists
    await db.discordUser.ensure(
      discordId,
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    try {
      // Request close with optional auto-close scheduling
      const { closeRequestId } = await TicketLifecycle.requestClose({
        ticketId: ticket.id,
        requestedById: discordId,
        reason: reason || undefined,
        autoCloseHours: delay || undefined,
      });

      // Log the close request
      await db.transcript.addHistoryEntry(
        ticket.id,
        "close_requested",
        interaction.user.id,
        reason ? `Close requested with reason: ${reason}` : "Close requested"
      );

      // Build response
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_confirm_${closeRequestId}`)
          .setLabel("✅ Approve")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`close_cancel_${closeRequestId}`)
          .setLabel("❌ Deny")
          .setStyle(ButtonStyle.Danger)
      );

      const description = [
        `<@${ticket.openerId}>, staff member <@${interaction.user.id}> has requested to close this ticket.`,
        reason && `**Reason:** ${reason}`,
        delay > 0 &&
          !ticket.excludeFromAutoclose &&
          `⏰ This ticket will automatically close in **${delay} hour${delay === 1 ? "" : "s"}** if no response is given.`,
        `Do you approve closing this ticket?`,
      ]
        .filter(Boolean)
        .join("\n\n");

      await InteractionResponse.reply(interaction, {
        embeds: [
          Embed.warning("Close Request", description).setFooter({
            text: "Only the ticket opener can approve or deny this request",
          }),
        ],
        components: [buttons],
      });

      return ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      await InteractionResponse.reply(interaction, {
        embeds: [Embed.error("Error", errorMessage)],
        flags: EPHEMERAL_FLAG,
      });

      return err(errorMessage);
    }
  }
}
