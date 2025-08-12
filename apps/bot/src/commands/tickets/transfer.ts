import { TicketCommandBase } from "@bot/lib/sapphire";
import type { Command } from "@sapphire/framework";
import { Embed, InteractionEdit, type Result, ok, err } from "@bot/lib/utils";
import { db } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { PermissionFlags } from "@ticketsbot/core";
import type { ChatInputCommandInteraction } from "discord.js";

export class TransferCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "transfer",
      description: "Transfer the current ticket to another staff member",
      preconditions: ["guild-only", "team-only", "ticket-channel-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("transfer")
        .setDescription("Transfer the current ticket to another staff member")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The staff member to transfer the ticket to")
            .setRequired(true)
        )
    );
  }

  protected override shouldDefer(): boolean {
    return true;
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any
  ): Promise<Result<void>> {
    const targetUser = interaction.options.getUser("user", true);

    // Check if target user has permission
    const targetHasPermission = await db.role.hasPermission(
      parseDiscordId(interaction.guild!.id),
      parseDiscordId(targetUser.id),
      PermissionFlags.TICKET_VIEW_ALL
    );

    if (!targetHasPermission) {
      return err(`<@${targetUser.id}> is not a staff member.`);
    }

    // Check self-transfer
    if (targetUser.id === interaction.user.id) {
      return err("You cannot transfer a ticket to yourself.");
    }

    // Check if ticket is currently claimed
    const currentClaim = await db.ticket.getCurrentClaim(ticket.id);

    // If currently claimed, unclaim it first
    if (currentClaim) {
      await db.ticket.unclaim({
        ticketId: ticket.id,
        performedById: interaction.user.id,
      });
    }

    // Then claim it for the target user
    await db.ticket.claim({
      ticketId: ticket.id,
      claimerId: targetUser.id,
      force: true, // Force claim for transfer
    });

    // Log the transfer
    await db.transcript.addHistoryEntry(
      ticket.id,
      "transferred",
      interaction.user.id,
      `Transferred to ${targetUser.tag} (${targetUser.id})`
    );

    // Send success message
    await InteractionEdit.edit(interaction, {
      embeds: [
        Embed.info(
          "Ticket Transferred",
          `This ticket has been transferred from <@${interaction.user.id}> to <@${targetUser.id}>.`
        ).setFooter({ text: `Ticket ID: ${ticket.id}` }),
      ],
    });

    return ok(undefined);
  }
}
