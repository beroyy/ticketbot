import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import {
  Embed,
  InteractionResponse,
  type Result,
  ok,
  err,
  EPHEMERAL_FLAG,
} from "@bot/lib/discord-utils";
import { ensureDiscordUser } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { prisma } from "@ticketsbot/db";
import type { ChatInputCommandInteraction } from "discord.js";
import { container } from "@sapphire/framework";

export class AutoCloseCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "autoclose",
      description: "Manage auto-close settings for tickets",
      preconditions: ["guild-only", "team-only", "ticket-channel-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("autoclose")
        .setDescription("Manage auto-close settings for tickets")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("exclude")
            .setDescription("Toggle auto-close exclusion for this ticket")
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
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "exclude") {
      const newExclusionStatus = !ticket.excludeFromAutoclose;

      const performerDiscordId = parseDiscordId(interaction.user.id);

      await ensureDiscordUser(
        performerDiscordId,
        interaction.user.username,
        interaction.user.discriminator,
        interaction.user.displayAvatarURL()
      );

      try {
        await prisma.$transaction(async (tx) => {
          // Update the exclusion status directly with transaction client
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              excludeFromAutoclose: newExclusionStatus,
            },
          });

          // Log the change directly with transaction client
          await tx.ticketLifecycleEvent.create({
            data: {
              ticketId: ticket.id,
              action: newExclusionStatus ? "auto_close_excluded" : "auto_close_included",
              performedById: performerDiscordId,
              details: {
                message: `Auto-close ${newExclusionStatus ? "disabled" : "enabled"} by support staff`,
              },
              timestamp: new Date(),
            },
          });

          // With pg_cron, auto-close is automatically skipped when excludeFromAutoclose is true
        });

        // Send response
        await InteractionResponse.reply(interaction, {
          embeds: [
            newExclusionStatus
              ? Embed.warning(
                  "Auto-close Settings Updated",
                  "This ticket is now **excluded** from auto-close operations. Any scheduled auto-close has been cancelled."
                )
              : Embed.success(
                  "Auto-close Settings Updated",
                  "This ticket is now **included** in auto-close operations."
                ),
          ].map((embed) => embed.setFooter({ text: `Ticket ID: ${ticket.id}` })),
        });
      } catch (error) {
        container.logger.error("Failed to update auto-close exclusion:", error);
        await InteractionResponse.reply(interaction, {
          embeds: [Embed.error("Error", "Failed to update auto-close settings")],
          flags: EPHEMERAL_FLAG,
        });
        return err("Failed to update auto-close exclusion");
      }
    }

    return ok(undefined);
  }
}
