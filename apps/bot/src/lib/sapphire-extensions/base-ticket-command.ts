import { BaseCommand } from "./base-command";
import type { ChatInputCommandInteraction, User as DiscordUser } from "discord.js";
import { type Result, ok, err, match, flatMap } from "@bot/lib/discord-utils/result";
import { InteractionResponse, InteractionEdit } from "@bot/lib/discord-utils/responses";
import { findByChannelId } from "@ticketsbot/core/domains/ticket";
import { ensureDiscordUser } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";
import { EPHEMERAL_FLAG } from "../discord-utils/constants";

/**
 * Base class for ticket-related commands with common functionality
 */
export abstract class TicketCommandBase extends BaseCommand {
  /**
   * Execute the command with automatic ticket context
   * Subclasses should implement executeTicketCommand instead
   */
  public override async chatInputRunWithContext(interaction: ChatInputCommandInteraction) {
    // Handle deferral if needed
    if (this.shouldDefer(interaction)) {
      await interaction.deferReply({
        flags: this.deferEphemeral(interaction) ? EPHEMERAL_FLAG : undefined,
      });
    }

    // For non-ticket channel commands, execute directly
    if (!this.requiresTicketChannel()) {
      return this.executeCommand(interaction);
    }

    // Get ticket from channel
    const ticketResult = await this.getTicketFromChannel(interaction);

    await match(ticketResult, {
      ok: async (ticket) => {
        // Store ticket on interaction for preconditions compatibility
        Reflect.set(interaction, "ticket", ticket);

        // Execute the ticket command
        const result = await this.executeTicketCommand(interaction, ticket);

        // Handle result with standard pattern
        await this.handleResult(interaction, result);
      },
      err: async (error) => {
        await InteractionResponse.error(interaction, error);
      },
    });
  }

  /**
   * Get ticket from the current channel
   */
  protected async getTicketFromChannel(
    interaction: ChatInputCommandInteraction
  ): Promise<Result<any>> {
    if (!interaction.channelId) {
      return err("No channel ID available");
    }

    const ticket = await findByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      return err("This is not a ticket channel.");
    }

    return ok(ticket);
  }

  /**
   * Handle command result with standard success/error pattern
   */
  protected async handleResult<T>(
    interaction: ChatInputCommandInteraction,
    result: Result<T>
  ): Promise<void> {
    await match(result, {
      ok: async (value) => {
        await this.onSuccess(interaction, value);
      },
      err: async (error, context) => {
        container.logger.error(`Error in ${this.name} command:`, { error, context });

        if (!interaction.replied && !interaction.deferred) {
          await InteractionResponse.error(interaction, error);
        } else if (interaction.deferred) {
          await InteractionResponse.error(interaction, error);
        }
      },
    });
  }

  /**
   * Ensure a Discord user exists in the database
   */
  protected async ensureUser(user: DiscordUser): Promise<string> {
    const discordId = parseDiscordId(user.id);
    await ensureDiscordUser(discordId, user.username, user.discriminator, user.displayAvatarURL());
    return discordId;
  }

  /**
   * Validate and transform an option value with a validator function
   */
  protected validateOption<T>(
    value: T | null,
    validator: (value: T) => Result<T>
  ): Result<T | null> {
    if (value === null) return ok(null);
    return validator(value);
  }

  /**
   * Reply with a formatted ticket response
   */
  protected async replyTicketSuccess(
    interaction: ChatInputCommandInteraction,
    title: string,
    description: string,
    ticketId?: string | number
  ): Promise<void> {
    const response = interaction.deferred ? InteractionEdit : InteractionResponse;
    await response.success(
      interaction,
      `**${title}**\n${description}${ticketId ? `\n\n*Ticket ID: ${ticketId}*` : ""}`
    );
  }

  /**
   * Reply with a formatted ticket info
   */
  protected async replyTicketInfo(
    interaction: ChatInputCommandInteraction,
    title: string,
    description: string,
    ticketId?: string | number
  ): Promise<void> {
    const response = interaction.deferred ? InteractionEdit : InteractionResponse;
    await response.info(
      interaction,
      `**${title}**\n${description}${ticketId ? `\n\n*Ticket ID: ${ticketId}*` : ""}`
    );
  }

  /**
   * Check if user is ticket opener
   */
  protected isTicketOpener(ticket: any, userId: string): boolean {
    return ticket.openerId.toString() === userId;
  }

  /**
   * Check if ticket is claimed
   */
  protected isTicketClaimed(ticket: any): boolean {
    return !!ticket.claimedById;
  }

  /**
   * Check if user has claimed the ticket
   */
  protected isClaimedBy(ticket: any, userId: string): boolean {
    return ticket.claimedById?.toString() === userId;
  }

  /**
   * Compose multiple validation steps
   */
  protected composeValidations<T>(
    value: T,
    ...validators: Array<(value: T) => Result<T>>
  ): Result<T> {
    return validators.reduce(
      (result, validator) => flatMap(result, validator),
      ok(value) as Result<T>
    );
  }

  /**
   * Override to specify if command should defer reply
   */
  protected shouldDefer(_interaction: ChatInputCommandInteraction): boolean {
    return true;
  }

  /**
   * Override to specify if deferral should be ephemeral
   */
  protected deferEphemeral(_interaction: ChatInputCommandInteraction): boolean {
    return false;
  }

  /**
   * Override to specify if command requires ticket channel
   */
  protected requiresTicketChannel(): boolean {
    return true;
  }

  /**
   * Success handler - override for custom success behavior
   */
  protected async onSuccess<T>(
    _interaction: ChatInputCommandInteraction,
    _result: T
  ): Promise<void> {
    // Default: no action, subclasses should handle their own success
  }

  /**
   * Execute command for non-ticket channel commands
   * Used when requiresTicketChannel() returns false
   */
  protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const result = await this.executeTicketCommand(interaction, null);
    await this.handleResult(interaction, result);
  }

  /**
   * Subclasses must implement this method
   * @param ticket - The ticket if in ticket channel, null otherwise
   */
  protected abstract executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any | null
  ): Promise<Result<any>>;
}
