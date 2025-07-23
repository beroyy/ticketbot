import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { ChannelOps } from "@bot/lib/discord-operations";
import { Embed, InteractionEdit, type Result, ok, err } from "@bot/lib/discord-utils";
import { Ticket, Transcripts } from "@ticketsbot/core/domains";
import type { ChatInputCommandInteraction, TextChannel } from "discord.js";

export class RemoveCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "remove",
      description: "Remove a user from the current ticket",
      preconditions: ["guild-only", "team-only", "ticket-channel-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("remove")
        .setDescription("Remove a user from the current ticket")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to remove from the ticket")
            .setRequired(true)
        )
    );
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any
  ): Promise<Result<void>> {
    const targetUser = interaction.options.getUser("user", true);

    // Check if user is the ticket opener
    if (this.isTicketOpener(ticket, targetUser.id)) {
      return err("Cannot remove the ticket opener from their own ticket.");
    }

    // Ensure user exists and get Discord ID
    const targetDiscordId = await this.ensureUser(targetUser);

    // Remove user from ticket participants
    try {
      await Ticket.removeParticipant(ticket.id, targetDiscordId);
    } catch (error) {
      // If they're not a participant, continue anyway to remove Discord permissions
      if (error instanceof Error && !error.message.includes("Cannot remove ticket opener")) {
        // Log non-critical errors but continue
        this.container.logger.debug(`User ${targetDiscordId} was not a participant, continuing with permission removal`);
      } else {
        // Re-throw critical errors
        throw error;
      }
    }

    // Update Discord permissions
    const channel = interaction.channel as TextChannel;
    await ChannelOps.permissions.remove(channel, targetUser.id);

    // Send success message
    await InteractionEdit.edit(interaction, {
      embeds: [
        Embed.success(
          "User Removed",
          `<@${targetUser.id}> has been removed from this ticket by <@${interaction.user.id}>.`
        ),
      ],
    });

    // Log the action
    await Transcripts.addHistoryEntry(
      ticket.id,
      "user_removed",
      interaction.user.id,
      `Removed user: ${targetUser.tag} (${targetUser.id})`
    );

    return ok(undefined);
  }
}