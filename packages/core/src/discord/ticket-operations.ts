import { Discord } from "./index";
import type { TextChannel } from "discord.js";
import { db } from "@ticketsbot/db";

const getTicketLifecycle = async () => {
  const { TicketLifecycle } = await import("../domains/ticket-lifecycle");
  return TicketLifecycle;
};

const getTranscripts = async () => {
  const { Transcripts } = await import("../domains/transcripts");
  return Transcripts;
};

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

  const channelName = `ticket-${Date.now().toString(36)}`;

  const { channelId } = await Discord.createTicketChannel({
    guildId: data.guildId,
    name: channelName,
    categoryId: data.categoryId,
    topic: `Ticket for <@${data.userId}>`,
    isThread: data.useThreads,
    parentChannelId: data.parentChannelId,
  });

  const ticket = await TicketLifecycle.create({
    guildId: data.guildId,
    channelId,
    openerId: data.userId,
    panelId: data.panelId,
    subject: data.subject,
    categoryId: data.categoryId,
  });

  return {
    ticketId: ticket.id,
    channelId,
  };
};

export const closeTicket = async (data: {
  ticketId: number;
  closedById: string;
  reason?: string;
  deleteChannel?: boolean;
}): Promise<void> => {
  const TicketLifecycle = await getTicketLifecycle();

  const ticket = await db.ticket.getByIdUnchecked(data.ticketId);
  if (!ticket) throw new Error("Ticket not found");

  await TicketLifecycle.close({
    ticketId: data.ticketId,
    closedById: data.closedById,
    reason: data.reason,
    deleteChannel: data.deleteChannel || false,
    notifyOpener: true,
  });

  if (data.deleteChannel && ticket.channelId) {
    await Discord.deleteTicketChannel(ticket.guildId, ticket.channelId);
  }
};

export const sendTicketMessage = async (
  ticketId: number,
  content: string | object
): Promise<void> => {
  const ticket = await db.ticket.getByIdUnchecked(ticketId);
  if (!ticket || !ticket.channelId) throw new Error("Ticket or channel not found");

  const { messageId } = await Discord.sendMessage(ticket.guildId, ticket.channelId, content);

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

export const updateTicketPermissions = async (
  ticketId: number,
  permissions: {
    allowedUsers?: string[];
    allowedRoles?: string[];
    deniedUsers?: string[];
  }
): Promise<void> => {
  const client = await Discord.getDiscordClient();

  const ticket = await db.ticket.getByIdUnchecked(ticketId);
  if (!ticket || !ticket.channelId) throw new Error("Ticket or channel not found");

  const guild = await client.guilds.fetch(ticket.guildId);
  const channel = (await guild.channels.fetch(ticket.channelId)) as TextChannel;

  if (!channel) throw new Error("Channel not found");

  const updates: Promise<any>[] = [];

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
