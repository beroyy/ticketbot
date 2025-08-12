import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { db } from "@ticketsbot/db";
import { parseDiscordId, PermissionFlags } from "@ticketsbot/core";
import { PreconditionErrors } from "@bot/lib/utils/error-handlers";

export const CanCloseTicketPrecondition = class extends Precondition {
  public static override readonly name = "can-close-ticket";

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel) {
      return this.error({
        message: PreconditionErrors.notInChannel,
        context: { silent: true },
      });
    }

    const ticket = await db.ticket.getByChannelId(parseDiscordId(interaction.channel.id));

    if (!ticket) {
      return this.error({
        message: PreconditionErrors.notTicketChannel,
        context: { silent: true },
      });
    }

    // Store ticket for command use
    Reflect.set(interaction, "ticket", ticket);

    // Check if user is the ticket opener
    const isOpener = ticket.openerId.toString() === interaction.user.id;
    if (isOpener) {
      return this.ok();
    }

    // Check if user has permission to close any ticket
    const hasCloseAnyPermission = await db.role.hasPermission(
      parseDiscordId(interaction.guild!.id),
      parseDiscordId(interaction.user.id),
      PermissionFlags.TICKET_CLOSE_ANY
    );

    if (hasCloseAnyPermission) {
      return this.ok();
    }

    // Check if user has claimed the ticket
    const isClaimer = ticket.claimedById === parseDiscordId(interaction.user.id);
    if (isClaimer) {
      return this.ok();
    }

    return this.error({
      message: PreconditionErrors.cannotCloseTicket,
      context: { silent: true },
    });
  }
};
