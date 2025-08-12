import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { ChannelOps } from "@bot/lib/discord-operations";
import { type Result, ok } from "@bot/lib/discord-utils";
import { db } from "@ticketsbot/db";
import type { ChatInputCommandInteraction, TextChannel } from "discord.js";

export class AddCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "add",
      description: "Add a user to the current ticket",
      preconditions: ["guild-only", "team-only", "ticket-channel-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("add")
        .setDescription("Add a user to the current ticket")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to add to the ticket").setRequired(true)
        )
    );
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any
  ): Promise<Result<void>> {
    const targetUser = interaction.options.getUser("user", true);

    // Ensure user exists and get Discord ID
    const targetDiscordId = await this.ensureUser(targetUser);

    // Add user as a participant in the ticket
    await db.ticket.addParticipant(ticket.id, targetDiscordId, "participant");

    // Update Discord permissions
    const channel = interaction.channel as TextChannel;
    await ChannelOps.permissions.update(channel, targetUser.id, {
      view: true,
      send: true,
      history: true,
    });

    // Send success message using helper
    await this.replyTicketSuccess(
      interaction,
      "User Added",
      `<@${targetUser.id}> has been added to this ticket by <@${interaction.user.id}>.`
    );

    // Log the action
    await db.transcript.addHistoryEntry(
      ticket.id,
      "user_added",
      interaction.user.id,
      `Added user: ${targetUser.tag} (${targetUser.id})`
    );

    return ok(undefined);
  }
}
