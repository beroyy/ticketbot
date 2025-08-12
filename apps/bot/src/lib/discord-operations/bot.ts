import { container } from "@sapphire/framework";
import type { Client, Guild, User, GuildMember, TextChannel } from "discord.js";

// Import all operation namespaces
import * as channelOps from "./operations/channel";
import * as messageOps from "./operations/message";
import * as panelOps from "./operations/panel";
import * as transcriptOps from "./operations/transcript";
import * as roleOps from "./operations/roles";
import * as ticketOps from "./operations/ticket";
import * as loggingOps from "./operations/logging";
import * as feedbackOps from "./operations/feedback";

/**
 * Unified bot operations client
 * Provides a single entry point for all Discord bot operations
 * Similar to the database client pattern
 */
export const bot = {
  // Core operation namespaces
  channel: channelOps,
  message: messageOps,
  panel: panelOps,
  transcript: transcriptOps,
  role: roleOps,
  ticket: ticketOps,
  logging: loggingOps,
  feedback: feedbackOps,

  // Direct client access when needed
  get client(): Client {
    return container.client;
  },

  // Cache access utilities
  cache: {
    guild: (id: string) => container.client.guilds.cache.get(id),
    channel: (id: string) => container.client.channels.cache.get(id),
    user: (id: string) => container.client.users.cache.get(id),
    member: (guildId: string, userId: string) => {
      const guild = container.client.guilds.cache.get(guildId);
      return guild?.members.cache.get(userId);
    },
    role: (guildId: string, roleId: string) => {
      const guild = container.client.guilds.cache.get(guildId);
      return guild?.roles.cache.get(roleId);
    },
  },

  // Fetch utilities with error handling
  fetch: {
    guild: async (id: string): Promise<Guild | null> => {
      try {
        return await container.client.guilds.fetch(id);
      } catch {
        return null;
      }
    },
    channel: async (id: string) => {
      try {
        return await container.client.channels.fetch(id);
      } catch {
        return null;
      }
    },
    user: async (id: string): Promise<User | null> => {
      try {
        return await container.client.users.fetch(id);
      } catch {
        return null;
      }
    },
    member: async (guildId: string, userId: string): Promise<GuildMember | null> => {
      try {
        const guild = await container.client.guilds.fetch(guildId);
        return await guild.members.fetch(userId);
      } catch {
        return null;
      }
    },
    role: async (guildId: string, roleId: string) => {
      try {
        const guild = await container.client.guilds.fetch(guildId);
        return await guild.roles.fetch(roleId);
      } catch {
        return null;
      }
    },
  },

  // Validation utilities
  validate: {
    snowflake: (id: string): boolean => /^\d{17,19}$/.test(id),
    
    permissions: (member: GuildMember, permissions: bigint): boolean => {
      return member.permissions.has(permissions);
    },
    
    botPermissions: (guild: Guild, permissions: bigint): boolean => {
      const botMember = guild.members.me;
      return botMember?.permissions.has(permissions) ?? false;
    },
    
    channelPermissions: (channel: TextChannel, member: GuildMember, permissions: bigint): boolean => {
      return channel.permissionsFor(member)?.has(permissions) ?? false;
    },
  },

  // Utility functions
  utils: {
    isReady: (): boolean => container.client.isReady(),
    
    // Format utilities
    mention: {
      user: (id: string): string => `<@${id}>`,
      channel: (id: string): string => `<#${id}>`,
      role: (id: string): string => `<@&${id}>`,
      command: (name: string, id: string): string => `</${name}:${id}>`,
    },
    
    // Common error codes and their meanings
    errorCode: {
      isUnknownChannel: (code: number): boolean => code === 10003,
      isUnknownMessage: (code: number): boolean => code === 10008,
      isMissingAccess: (code: number): boolean => code === 50001,
      isMissingPermissions: (code: number): boolean => code === 50013,
      isInvalidFormBody: (code: number): boolean => code === 50035,
      isReactionBlocked: (code: number): boolean => code === 90001,
    },
    
    // Error handling
    handleError: (error: unknown): { error: string; code?: number } => {
      if (error instanceof Error) {
        // Handle Discord API errors
        if ('code' in error) {
          const discordError = error as any;
          switch (discordError.code) {
            case 10003: return { error: "Unknown channel", code: 10003 };
            case 10004: return { error: "Unknown guild", code: 10004 };
            case 10007: return { error: "Unknown member", code: 10007 };
            case 10008: return { error: "Unknown message", code: 10008 };
            case 10011: return { error: "Unknown role", code: 10011 };
            case 10013: return { error: "Unknown user", code: 10013 };
            case 50001: return { error: "Missing access", code: 50001 };
            case 50013: return { error: "Missing permissions", code: 50013 };
            case 50035: return { error: "Invalid form body", code: 50035 };
            case 90001: return { error: "Reaction blocked", code: 90001 };
            default: return { error: discordError.message || "Unknown Discord error", code: discordError.code };
          }
        }
        return { error: error.message };
      }
      return { error: "An unknown error occurred" };
    },

    // Common patterns
    ensureGuild: async (guildId: string): Promise<Guild> => {
      const guild = await bot.fetch.guild(guildId);
      if (!guild) throw new Error("Guild not found");
      return guild;
    },

    ensureChannel: async (channelId: string): Promise<TextChannel> => {
      const channel = await bot.fetch.channel(channelId);
      if (!channel || !channel.isTextBased()) throw new Error("Text channel not found");
      return channel as TextChannel;
    },

    ensureMember: async (guildId: string, userId: string): Promise<GuildMember> => {
      const member = await bot.fetch.member(guildId, userId);
      if (!member) throw new Error("Member not found");
      return member;
    },
  },

  // Batch operations for efficiency
  batch: {
    // Send multiple messages efficiently
    sendMessages: async (messages: Array<{ channelId: string; content: any }>) => {
      const results = await Promise.allSettled(
        messages.map(async ({ channelId, content }) => {
          const channel = await bot.fetch.channel(channelId);
          if (channel?.isTextBased() && 'send' in channel) {
            return await channel.send(content);
          }
          throw new Error(`Channel ${channelId} is not text-based or cannot send messages`);
        })
      );
      return results;
    },

    // Delete multiple messages
    deleteMessages: async (channelId: string, messageIds: string[]): Promise<void> => {
      const channel = await bot.fetch.channel(channelId);
      if (channel?.isTextBased() && 'bulkDelete' in channel) {
        await channel.bulkDelete(messageIds);
      } else {
        throw new Error("Cannot bulk delete in this channel");
      }
    },

    // Fetch multiple members
    fetchMembers: async (guildId: string, userIds: string[]): Promise<Map<string, GuildMember | null>> => {
      const guild = await bot.fetch.guild(guildId);
      if (!guild) return new Map();
      
      const results = new Map<string, GuildMember | null>();
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const member = await guild.members.fetch(userId);
            results.set(userId, member);
          } catch {
            results.set(userId, null);
          }
        })
      );
      return results;
    },
  },

  // Health check
  health: {
    check: async (): Promise<{
      healthy: boolean;
      ping: number;
      ready: boolean;
      guilds: number;
      uptime: number | null;
      shardId?: number;
    }> => {
      try {
        const client = container.client;
        const ping = client.ws.ping;
        const ready = client.isReady();
        const guilds = client.guilds.cache.size;
        
        return {
          healthy: ready && ping > 0,
          ping,
          ready,
          guilds,
          uptime: client.uptime,
          shardId: client.shard?.ids[0],
        };
      } catch {
        return {
          healthy: false,
          ping: -1,
          ready: false,
          guilds: 0,
          uptime: null,
        };
      }
    },

    // Check specific guild health
    guildHealth: async (guildId: string): Promise<{
      available: boolean;
      memberCount?: number;
      channelCount?: number;
      roleCount?: number;
      hasBot?: boolean;
    }> => {
      try {
        const guild = await bot.fetch.guild(guildId);
        if (!guild) return { available: false };
        
        return {
          available: true,
          memberCount: guild.memberCount,
          channelCount: guild.channels.cache.size,
          roleCount: guild.roles.cache.size,
          hasBot: guild.members.me !== null,
        };
      } catch {
        return { available: false };
      }
    },
  },
};

// Export the type for use in other files
export type BotClient = typeof bot;