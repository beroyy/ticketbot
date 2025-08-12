import { BaseCommand } from "./base-command";
import type { ChatInputCommandInteraction, User as DiscordUser } from "discord.js";
import { type Result, ok, err, match, flatMap } from "@bot/lib/utils/result";
import { InteractionResponse, InteractionEdit } from "@bot/lib/utils/responses";
import { db } from "@ticketsbot/db";
import { container } from "@sapphire/framework";
import { EPHEMERAL_FLAG } from "../utils/constants";

export abstract class TicketCommandBase extends BaseCommand {
  public override async chatInputRunWithContext(interaction: ChatInputCommandInteraction) {
    if (this.shouldDefer(interaction)) {
      await interaction.deferReply({
        flags: this.deferEphemeral(interaction) ? EPHEMERAL_FLAG : undefined,
      });
    }

    if (!this.requiresTicketChannel()) {
      return this.executeCommand(interaction);
    }

    const ticketResult = await this.getTicketFromChannel(interaction);

    await match(ticketResult, {
      ok: async (ticket) => {
        Reflect.set(interaction, "ticket", ticket);

        const result = await this.executeTicketCommand(interaction, ticket);

        await this.handleResult(interaction, result);
      },
      err: async (error) => {
        await InteractionResponse.error(interaction, error);
      },
    });
  }

  protected async getTicketFromChannel(
    interaction: ChatInputCommandInteraction
  ): Promise<Result<any>> {
    if (!interaction.channelId) {
      return err("No channel ID available");
    }

    const ticket = await db.ticket.getByChannelId(interaction.channelId);
    if (!ticket) {
      return err("This is not a ticket channel.");
    }

    return ok(ticket);
  }

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

  protected async ensureUser(user: DiscordUser): Promise<string> {
    const discordId = user.id;
    await db.discordUser.ensureDiscordUser(
      discordId,
      user.username,
      user.discriminator,
      user.displayAvatarURL()
    );
    return discordId;
  }

  protected validateOption<T>(
    value: T | null,
    validator: (value: T) => Result<T>
  ): Result<T | null> {
    if (value === null) return ok(null);
    return validator(value);
  }

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

  protected isTicketOpener(ticket: any, userId: string): boolean {
    return ticket.openerId.toString() === userId;
  }

  protected isTicketClaimed(ticket: any): boolean {
    return !!ticket.claimedById;
  }

  protected isClaimedBy(ticket: any, userId: string): boolean {
    return ticket.claimedById?.toString() === userId;
  }

  protected composeValidations<T>(
    value: T,
    ...validators: Array<(value: T) => Result<T>>
  ): Result<T> {
    return validators.reduce(
      (result, validator) => flatMap(result, validator),
      ok(value) as Result<T>
    );
  }

  protected shouldDefer(_interaction: ChatInputCommandInteraction): boolean {
    return true;
  }

  protected deferEphemeral(_interaction: ChatInputCommandInteraction): boolean {
    return false;
  }

  protected requiresTicketChannel(): boolean {
    return true;
  }

  protected async onSuccess<T>(
    _interaction: ChatInputCommandInteraction,
    _result: T
  ): Promise<void> {}

  protected async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const result = await this.executeTicketCommand(interaction, null);
    await this.handleResult(interaction, result);
  }

  protected abstract executeTicketCommand(
    interaction: ChatInputCommandInteraction,
    ticket: any | null
  ): Promise<Result<any>>;
}
