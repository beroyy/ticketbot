import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { Embed, InteractionResponse, type Result, ok, err } from "@bot/lib/discord-utils";
import { User, Ticket, ScheduledTask, Transcripts } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import type { ChatInputCommandInteraction } from "discord.js";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
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

      await User.ensure(
        performerDiscordId,
        interaction.user.username,
        interaction.user.discriminator,
        interaction.user.displayAvatarURL()
      );

      try {
        await withTransaction(async () => {
          // Update the exclusion status
          await Ticket.update(ticket.id, {
            excludeFromAutoclose: newExclusionStatus,
          });

          // Log the change
          await Transcripts.addHistoryEntry(
            ticket.id,
            newExclusionStatus ? "auto_close_excluded" : "auto_close_included",
            performerDiscordId,
            `Auto-close ${newExclusionStatus ? "disabled" : "enabled"} by support staff`
          );

          // Cancel any pending auto-close jobs if excluding
          if (newExclusionStatus) {
            afterTransaction(async () => {
              await ScheduledTask.cancelAutoCloseForTicket(ticket.id);
            });
          }
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
          ephemeral: true,
        });
        return err("Failed to update auto-close exclusion");
      }
    }

    return ok(undefined);
  }
}