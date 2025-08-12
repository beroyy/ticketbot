import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { Embed, InteractionEdit, type Result, ok, err } from "@bot/lib/discord-utils";
import type { ChatInputCommandInteraction } from "discord.js";
import { db } from "@ticketsbot/db";

export class UnclaimCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "unclaim",
      description: "Remove your claim from the current ticket",
      preconditions: ["guild-only", "team-only", "ticket-channel-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("unclaim").setDescription("Remove your claim from the current ticket")
    );
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any
  ): Promise<Result<void>> {
    // Check if ticket is claimed and user owns it
    try {
      const currentClaim = await db.ticketLifecycle.getCurrentClaim(ticket.id);
      if (!currentClaim) {
        return err("This ticket is not currently claimed.");
      }
      if (currentClaim.claimedById !== interaction.user.id) {
        return err("You can only unclaim tickets that you have claimed.");
      }
    } catch (_error) {
      return err("Failed to check ticket claim status.");
    }

    // Unclaim the ticket - context is already provided by BaseCommand
    await db.ticketLifecycle.unclaim({
      ticketId: ticket.id,
      performedById: interaction.user.id,
    });

    // Send success message
    await InteractionEdit.edit(interaction, {
      embeds: [
        Embed.warning(
          "Ticket Unclaimed",
          `<@${interaction.user.id}> has unclaimed this ticket. It is now available for other staff members.`
        ).setFooter({ text: `Ticket ID: ${ticket.id}` }),
      ],
    });

    return ok(undefined);
  }
}
