/**
 * Ticket-specific Discord API operations
 * Provides helper functions for ticket-related Discord operations
 */

import { Discord } from "./index";
import type { TextChannel } from "discord.js";

// Import domains dynamically to avoid circular dependencies
const getTicketLifecycle = async () => {
  const { TicketLifecycle } = await import("../domains/ticket-lifecycle");
  return TicketLifecycle;
};

const getTranscripts = async () => {
  const { Transcripts } = await import("../domains/transcripts");
  return Transcripts;
};

const getTicket = async () => {
  const { Ticket } = await import("../domains/ticket");
  return Ticket;
};


/**
 * Create a ticket from a panel interaction
 */
export const createTicketFromPanel = async (data: {
  guildId: string;
  userId: string;
  panelId: number;
  subject?: string;
  categoryId?: string;
  useThreads?: boolean;
  parentChannelId?: string;
}): Promise<{ ticketId: number; channelId: string }> => {
  const TicketLifecycle = await getTicketLifecycle();

  // Generate channel name
  const channelName = `ticket-${Date.now().toString(36)}`;

  // Create the channel first
  const { channelId } = await Discord.createTicketChannel({
    guildId: data.guildId,
    name: channelName,
    categoryId: data.categoryId,
    topic: `Ticket for <@${data.userId}>`,
    isThread: data.useThreads,
    parentChannelId: data.parentChannelId,
  });

  // Create the ticket record
  const ticket = await TicketLifecycle.create({
    guildId: data.guildId,
    channelId,
    openerId: data.userId,
    panelId: data.panelId,
    subject: data.subject,
    categoryId: data.categoryId,
  });

  // Note: The bot application handles post-creation actions like welcome messages

  return {
    ticketId: ticket.id,
    channelId,
  };
};

/**
 * Close a ticket and optionally delete the channel
 */
export const closeTicket = async (data: {
  ticketId: number;
  closedById: string;
  reason?: string;
  deleteChannel?: boolean;
}): Promise<void> => {
  const TicketLifecycle = await getTicketLifecycle();
  const Ticket = await getTicket();

  // Get ticket details
  const ticket = await Ticket.getByIdUnchecked(data.ticketId);
  if (!ticket) throw new Error("Ticket not found");

  // Close the ticket
  await TicketLifecycle.close({
    ticketId: data.ticketId,
    closedById: data.closedById,
    reason: data.reason,
    deleteChannel: data.deleteChannel || false,
    notifyOpener: true,
  });

  // Delete the channel if requested
  if (data.deleteChannel && ticket.channelId) {
    await Discord.deleteTicketChannel(ticket.guildId, ticket.channelId);
  }
};

/**
 * Send a message to a ticket channel
 */
export const sendTicketMessage = async (
  ticketId: number,
  content: string | object
): Promise<void> => {
  const Ticket = await getTicket();

  // Get ticket details
  const ticket = await Ticket.getByIdUnchecked(ticketId);
  if (!ticket || !ticket.channelId) throw new Error("Ticket or channel not found");

  // Send the message
  const { messageId } = await Discord.sendMessage(ticket.guildId, ticket.channelId, content);

  // Store in transcript if it's a string message
  if (typeof content === "string") {
    const Transcripts = await getTranscripts();
    await Transcripts.storeMessage({
      ticketId,
      messageId,
      authorId: "system",
      content,
      embeds: null,
      attachments: null,
      messageType: "system",
      referenceId: null,
    });
  }
};

/**
 * Update ticket channel permissions
 */
export const updateTicketPermissions = async (
  ticketId: number,
  permissions: {
    allowedUsers?: string[];
    allowedRoles?: string[];
    deniedUsers?: string[];
  }
): Promise<void> => {
  const Ticket = await getTicket();
  const client = await Discord.getDiscordClient();

  // Get ticket details
  const ticket = await Ticket.getByIdUnchecked(ticketId);
  if (!ticket || !ticket.channelId) throw new Error("Ticket or channel not found");

  // Get the channel
  const guild = await client.guilds.fetch(ticket.guildId);
  const channel = (await guild.channels.fetch(ticket.channelId)) as TextChannel;

  if (!channel) throw new Error("Channel not found");

  // Update permissions
  const updates: Promise<any>[] = [];

  // Allow users
  if (permissions.allowedUsers) {
    for (const userId of permissions.allowedUsers) {
      updates.push(
        channel.permissionOverwrites.edit(userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        })
      );
    }
  }

  // Allow roles
  if (permissions.allowedRoles) {
    for (const roleId of permissions.allowedRoles) {
      updates.push(
        channel.permissionOverwrites.edit(roleId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        })
      );
    }
  }

  // Deny users
  if (permissions.deniedUsers) {
    for (const userId of permissions.deniedUsers) {
      updates.push(
        channel.permissionOverwrites.edit(userId, {
          ViewChannel: false,
        })
      );
    }
  }

  await Promise.all(updates);
};
