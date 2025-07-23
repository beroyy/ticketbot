import { TicketCommandBase } from "@bot/lib/sapphire-extensions";
import type { Command } from "@sapphire/framework";
import { container } from "@sapphire/framework";
import { ChannelOps, MessageOps, TranscriptOps } from "@bot/lib/discord-operations";
import { InteractionResponse, type Result, ok, TicketValidation } from "@bot/lib/discord-utils";
import { Ticket, TicketLifecycle, getSettingsUnchecked } from "@ticketsbot/core/domains";
import { captureEvent } from "@ticketsbot/core/analytics";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
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

    await withTransaction(async () => {
      // Create ticket using lifecycle domain
      ticket = await TicketLifecycle.create({
        guildId: guild.id,
        channelId: "", // Will be updated after channel creation
        openerId: userId,
        subject: subjectResult.value ?? undefined,
        metadata: {
          createdVia: "discord",
          username,
        },
      });

      // Get guild settings
      const settings = await getSettingsUnchecked(guild.id);

      // Schedule Discord operations after transaction
      afterTransaction(async () => {
        try {
          // Create Discord channel
          channel = await ChannelOps.ticket.createWithPermissions(guild, {
            id: ticket.id,
            number: ticket.number,
            openerId: ticket.openerId,
            subject: ticket.subject,
          });

          // Update ticket with channel ID
          await Ticket.updateChannelId(ticket.id, channel.id);

          // Get ticket with form responses
          const ticketWithDetails = await Ticket.getById(ticket.id);

          // Send welcome message
          const welcomeEmbed = MessageOps.ticket.welcomeEmbed(ticketWithDetails);
          const actionButtons = MessageOps.ticket.actionButtons(settings.showClaimButton);

          const welcomeMessage = await channel.send({
            embeds: [welcomeEmbed],
            components: [actionButtons.toJSON()],
          });

          // Store welcome message in transcript
          await TranscriptOps.store.botMessage(welcomeMessage, { id: ticket.id });

          // Track event
          await captureEvent("ticket_created", {
            ticketId: ticket.id,
            ticketNumber: ticket.number,
            guildId: guild.id,
            userId,
            hasSubject: !!subjectResult.value,
            channelCreated: true,
          });
        } catch (error) {
          container.logger.error("Error in Discord operations:", error);
        }
      });
    });

    await InteractionResponse.success(
      interaction,
      `✅ **Ticket Created**\nYour ticket #${ticket.number} has been created successfully!\nPlease check your ticket channel for further assistance.${subjectResult.value ? `\n**Subject:** ${subjectResult.value}` : ""}`
    );

    return ok({ ticketId: ticket.id });
  }
}