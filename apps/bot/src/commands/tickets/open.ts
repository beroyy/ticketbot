import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { container } from "@sapphire/framework";
import { ChannelOps, MessageOps } from "@bot/lib/discord-operations";
import {
  InteractionResponse,
  type Result,
  ok,
  err,
  TicketValidation,
} from "@bot/lib/discord-utils";
import { Ticket } from "@ticketsbot/core/domains/ticket";
import { TicketLifecycle } from "@ticketsbot/core/domains/ticket-lifecycle";
import { db } from "@ticketsbot/db";
import { prisma } from "@ticketsbot/db";
import type { ChatInputCommandInteraction } from "discord.js";

export class OpenCommand extends TicketCommandBase {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "open",
      description: "Create a new support ticket",
      preconditions: ["guild-only"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("open")
        .setDescription("Create a new support ticket")
        .addStringOption((option) =>
          option
            .setName("subject")
            .setDescription("Brief description of your issue")
            .setMaxLength(100)
            .setRequired(false)
        )
    );
  }

  protected override requiresTicketChannel(): boolean {
    return false;
  }

  protected override shouldDefer(): boolean {
    return true;
  }

  protected override deferEphemeral(): boolean {
    return true;
  }

  protected override async executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    _ticket: null
  ): Promise<Result<{ ticketId: string }>> {
    const subject = interaction.options.getString("subject");
    const subjectResult = TicketValidation.subject(subject);

    if (!subjectResult.ok) {
      return subjectResult;
    }

    const guild = interaction.guild!;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    let ticket: any;
    let channel: any;

    const settings = await db.guild.getSettings(guild.id);

    const tempTicketData = {
      id: 0, // Will be replaced with actual ID
      number: 0, // Will be replaced with actual number
      openerId: userId,
      subject: subjectResult.value ?? null,
    };

    try {
      channel = await ChannelOps.ticket.createWithPermissions(guild, tempTicketData);
    } catch (error) {
      container.logger.error("Failed to create ticket channel:", error);
      return err("Failed to create ticket channel. Please try again.");
    }

    try {
      // Create ticket in transaction
      ticket = await prisma.$transaction(async (_tx) => {
        // Create ticket using lifecycle domain with actual channel ID
        const createdTicket = await TicketLifecycle.create({
          guildId: guild.id,
          channelId: channel.id,
          openerId: userId,
          subject: subjectResult.value ?? undefined,
          metadata: {
            createdVia: "discord",
            username,
          },
        });

        return createdTicket;
      });

      // Update channel name with actual ticket number
      try {
        await channel.setName(`ticket-${ticket.number}`);
      } catch (error) {
        container.logger.warn("Failed to update channel name:", error);
        // Non-critical error, continue
      }

      // Discord operations after transaction
      try {
        // Get ticket with form responses
        const ticketWithDetails = await Ticket.getById(ticket.id);

        // Send welcome message
        const welcomeEmbed = MessageOps.ticket.welcomeEmbed(ticketWithDetails);
        const actionButtons = MessageOps.ticket.actionButtons(settings?.showClaimButton ?? false);

        await channel.send({
          embeds: [welcomeEmbed],
          components: [actionButtons.toJSON()],
        });
      } catch (error) {
        container.logger.error("Error in Discord operations:", error);
      }
    } catch (error) {
      // If ticket creation fails, try to clean up the channel
      try {
        await channel.delete("Ticket creation failed");
      } catch (deleteError) {
        container.logger.error(
          "Failed to clean up channel after ticket creation failure:",
          deleteError
        );
      }
      throw error;
    }

    await InteractionResponse.success(
      interaction,
      `✅ **Ticket Created**\nYour ticket #${ticket.number} has been created successfully!\nPlease check your ticket channel for further assistance.${subjectResult.value ? `\n**Subject:** ${subjectResult.value}` : ""}`
    );

    return ok({ ticketId: ticket.id });
  }
}
