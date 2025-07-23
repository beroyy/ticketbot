import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { type Result, ok, err } from "@bot/lib/discord-utils";
import { TicketLifecycle } from "@ticketsbot/core/domains";
import type { ChatInputCommandInteraction } from "discord.js";

export class ClaimCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "claim",
      description: "Claim the current ticket as a staff member",
      preconditions: ["guild-only", "team-only", "ticket-channel-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("claim")
        .setDescription("Claim the current ticket as a staff member")
    );
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any
  ): Promise<Result<void>> {
    // Check if already claimed
    try {
      const currentClaim = await TicketLifecycle.getCurrentClaim(ticket.id);
      if (currentClaim) {
        return err(`This ticket is already claimed by <@${currentClaim.claimedById}>.`);
      }
    } catch (error) {
      // If error checking claim, proceed anyway
    }

    // Claim the ticket - context is already provided by BaseCommand
    await TicketLifecycle.claim({
      ticketId: ticket.id,
      claimerId: interaction.user.id,
      force: false,
    });

    // Send success message using helper
    await this.replyTicketInfo(
      interaction,
      "Ticket Claimed",
      `This ticket has been claimed by <@${interaction.user.id}>.`,
      ticket.id
    );

    return ok(undefined);
  }
}