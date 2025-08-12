import { err, ok, createButtonErrorHandler, ErrorResponses } from "@bot/lib/discord-utils";
import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { MessageOps } from "@bot/lib/discord-operations";
import type { ButtonInteraction } from "discord.js";
import { db } from "@ticketsbot/db";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { findByChannelId } from "@ticketsbot/core/domains/ticket";
import { parseDiscordId } from "@ticketsbot/core";

const ticketClaimHandler = createButtonHandler({
  pattern: "ticket_claim",

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel) return err("No channel");

    const ticket = await findByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply(ErrorResponses.notTicketChannel());
      return err("Not a ticket channel");
    }

    // Check if already claimed
    const currentClaim = await TicketLifecycle.getCurrentClaim(ticket.id);
    if (currentClaim) {
      await interaction.reply(ErrorResponses.ticketAlreadyClaimed(currentClaim.claimedById));
      return err("Ticket already claimed");
    }

    await db.discordUser.ensure(
      parseDiscordId(interaction.user.id),
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    // Claim ticket using lifecycle domain
    await TicketLifecycle.claim({
      ticketId: ticket.id,
      claimerId: interaction.user.id,
      force: false,
    });

    // Send success
    const embed = MessageOps.claim.successEmbed(interaction.user.id, ticket.id);

    await interaction.reply({ embeds: [embed] });
    return ok(undefined);
  },

  errorHandler: createButtonErrorHandler("ticket claim button handler"),
});

export const TicketClaimButtonHandler = createInteractionHandler("TicketClaimButton", [
  ticketClaimHandler,
]);
