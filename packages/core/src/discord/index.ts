/**
 * Functional Discord service namespace
 * Replaces the class-based DiscordClientService with a modern functional approach
 */

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  type TextChannel,
  type Guild,
  type MessageCreateOptions,
  ChannelType,
  type User,
} from "discord.js";
import { VisibleError } from "@ticketsbot/core/context";

// Types
interface PanelData {
  id: number;
  type: "SINGLE" | "MULTI";
  title: string;
  content?: string | null;
  guildId: string;
  channelId: string;
  emoji?: string | null;
  buttonText: string;
  color?: string | null;
  introTitle?: string | null;
  introDescription?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  textSections?: any;
  mentionRoles?: any;
  form?: any;
  children?: PanelData[]; // For multi-panels
}

interface DeploymentResult {
  messageId: string;
  channelId: string;
}

/**
 * Discord service namespace for bot operations
 */
// Event handler types
type TicketCreateHandler = (data: {
  guildId: string;
  channelId: string;
  openerId: string;
  panelId?: number;
  subject?: string;
}) => Promise<void>;

type TicketCloseHandler = (data: {
  ticketId: number;
  channelId: string;
  closedById: string;
  reason?: string;
}) => Promise<void>;

type MessageCreateHandler = (data: {
  channelId: string;
  messageId: string;
  authorId: string;
  content: string;
  attachments?: any[];
}) => Promise<void>;

export namespace Discord {
  // Singleton client instance
  let client: Client | null = null;
  let initPromise: Promise<Client> | null = null;

  // Event handlers
  let onTicketCreate: TicketCreateHandler | null = null;
  let onTicketClose: TicketCloseHandler | null = null;
  let onMessageCreate: MessageCreateHandler | null = null;

  /**
   * Get or initialize the Discord client
   */
  const getClient = async (): Promise<Client> => {
    // Return existing client if available
    if (client?.isReady()) {
      return client;
    }

    // Wait for ongoing initialization
    if (initPromise) {
      return initPromise;
    }

    // Start new initialization
    initPromise = initializeClient();
    client = await initPromise;
    initPromise = null;

    return client;
  };

  /**
   * Initialize Discord client
   */
  const initializeClient = async (): Promise<Client> => {
    const newClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    // Set up error handlers
    newClient.on("error", (error) => {
      console.error("Discord client error:", error);
    });

    newClient.on("warn", (warning) => {
      console.warn("Discord client warning:", warning);
    });

    // Set up event listeners for ticket operations
    newClient.on("messageCreate", async (message) => {
      if (!message.guild || message.author.bot) return;

      // Check if this is a ticket channel
      const isTicket = await isTicketChannel(message.guild.id, message.channel.id);
      if (isTicket && onMessageCreate) {
        try {
          await onMessageCreate({
            channelId: message.channel.id,
            messageId: message.id,
            authorId: message.author.id,
            content: message.content,
            attachments: message.attachments.map((a) => ({
              id: a.id,
              url: a.url,
              name: a.name,
              size: a.size,
            })),
          });
        } catch (error) {
          console.error("Error handling message create:", error);
        }
      }
    });

    // Handle channel deletion (ticket close)
    newClient.on("channelDelete", async (channel) => {
      // Skip DM channels and non-text channels
      if (channel.isDMBased() || !channel.isTextBased()) return;
      if (!("guild" in channel)) return;

      const isTicket = await isTicketChannel(channel.guild.id, channel.id);
      if (isTicket && onTicketClose) {
        try {
          // Note: We'd need to get the ticket ID from somewhere (channel topic, name, etc.)
          // This is a simplified example
          await onTicketClose({
            ticketId: 0, // Would need actual ticket ID
            channelId: channel.id,
            closedById: "system", // Channel deletion is system-initiated
            reason: "Channel deleted",
          });
        } catch (error) {
          console.error("Error handling channel delete:", error);
        }
      }
    });

    // Login with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Discord client login timeout"));
      }, 10000);

      newClient.once("ready", () => {
        clearTimeout(timeout);
        console.log(`Discord API ready as ${newClient.user?.tag}`);
        resolve();
      });

      newClient.login(process.env.DISCORD_TOKEN).catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    return newClient;
  };

  /**
   * Deploy a panel to Discord
   */
  export const deployPanel = async (panel: PanelData): Promise<DeploymentResult> => {
    const client = await getClient();

    // Validate guild
    const guild = await validateGuild(client, panel.guildId);

    // Get channel
    const channel = await getTextChannel(guild, panel.channelId);

    // Check permissions
    await checkChannelPermissions(channel);

    // Create and send message
    const messageOptions = createPanelMessage(panel);
    const message = await channel.send(messageOptions);

    return {
      messageId: message.id,
      channelId: channel.id,
    };
  };

  /**
   * Update a deployed panel
   */
  export const updatePanel = async (
    panel: PanelData,
    messageId: string
  ): Promise<DeploymentResult> => {
    const client = await getClient();

    // Validate guild
    const guild = await validateGuild(client, panel.guildId);

    // Get channel
    const channel = await getTextChannel(guild, panel.channelId);

    // Check permissions
    await checkChannelPermissions(channel);

    // Fetch existing message
    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (!message) {
      throw new VisibleError("not_found", "Panel message not found");
    }

    // Update message - use only embeds and components for edit
    const { embeds, components } = createPanelMessage(panel);
    await message.edit({ embeds, components });

    return {
      messageId: message.id,
      channelId: channel.id,
    };
  };

  /**
   * Delete a deployed panel
   */
  export const deletePanel = async (
    guildId: string,
    channelId: string,
    messageId: string
  ): Promise<void> => {
    const client = await getClient();

    try {
      const guild = await validateGuild(client, guildId);
      const channel = await getTextChannel(guild, channelId);
      const message = await channel.messages.fetch(messageId);

      await message.delete();
    } catch (error) {
      // Log but don't throw - panel may already be deleted
      console.warn(`Failed to delete panel message ${messageId}:`, error);
    }
  };

  /**
   * Get available channels for a guild
   */
  export const getGuildChannels = async (guildId: string) => {
    const client = await getClient();
    const guild = await validateGuild(client, guildId);

    const channels = guild.channels.cache
      .filter((channel) => channel.isTextBased() && !channel.isThread())
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return channels;
  };

  /**
   * Get available categories for a guild
   */
  export const getGuildCategories = async (guildId: string) => {
    const client = await getClient();
    const guild = await validateGuild(client, guildId);

    const categories = guild.channels.cache
      .filter((channel) => channel.type === 4) // CategoryChannel
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return categories;
  };

  /**
   * Get available roles for a guild
   */
  export const getGuildRoles = async (guildId: string) => {
    const client = await getClient();
    const guild = await validateGuild(client, guildId);

    const roles = guild.roles.cache
      .filter((role) => !role.managed && role.id !== guild.id) // Exclude bot/integration roles and @everyone
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
      }))
      .sort((a, b) => b.position - a.position);

    return roles;
  };

  /**
   * Check if bot is in a guild
   */
  export const isInGuild = async (guildId: string): Promise<boolean> => {
    try {
      const client = await getClient();
      const guild = await client.guilds.fetch(guildId);
      return !!guild;
    } catch {
      return false;
    }
  };

  /**
   * Get bot's permissions in a guild
   */
  export const getBotPermissions = async (guildId: string) => {
    const client = await getClient();
    const guild = await validateGuild(client, guildId);

    const member = guild.members.me;
    if (!member) {
      throw new VisibleError("not_found", "Bot is not a member of this guild");
    }

    return {
      canManageChannels: member.permissions.has(PermissionFlagsBits.ManageChannels),
      canManageRoles: member.permissions.has(PermissionFlagsBits.ManageRoles),
      canSendMessages: member.permissions.has(PermissionFlagsBits.SendMessages),
      canEmbedLinks: member.permissions.has(PermissionFlagsBits.EmbedLinks),
      canViewChannel: member.permissions.has(PermissionFlagsBits.ViewChannel),
      canManageMessages: member.permissions.has(PermissionFlagsBits.ManageMessages),
    };
  };

  // Helper functions

  const validateGuild = async (client: Client, guildId: string): Promise<Guild> => {
    try {
      const guild = await client.guilds.fetch(guildId);
      if (!guild) {
        throw new VisibleError("not_found", `Guild ${guildId} not found`);
      }
      return guild;
    } catch (error) {
      if (error instanceof VisibleError) throw error;
      throw new VisibleError("not_found", `Cannot access guild ${guildId}`);
    }
  };

  const getTextChannel = async (guild: Guild, channelId: string): Promise<TextChannel> => {
    try {
      const channel = await guild.channels.fetch(channelId);

      if (!channel) {
        throw new VisibleError("not_found", `Channel ${channelId} not found`);
      }

      if (!channel.isTextBased() || channel.isThread()) {
        throw new VisibleError("validation_error", "Channel must be a text channel");
      }

      return channel as TextChannel;
    } catch (error) {
      if (error instanceof VisibleError) throw error;
      throw new VisibleError("not_found", `Cannot access channel ${channelId}`);
    }
  };

  const checkChannelPermissions = async (channel: TextChannel): Promise<void> => {
    const permissions = channel.guild.members.me?.permissionsIn(channel);

    if (!permissions) {
      throw new VisibleError("permission_denied", "Cannot check bot permissions");
    }

    const required = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ];

    const missing = required.filter((perm) => !permissions.has(perm));

    if (missing.length > 0) {
      throw new VisibleError(
        "permission_denied",
        `Bot lacks required permissions in channel: ${missing.join(", ")}`
      );
    }
  };

  const createPanelMessage = (panel: PanelData): MessageCreateOptions => {
    const embed = createPanelEmbed(panel);
    const components = createPanelComponents(panel);

    return {
      embeds: [embed],
      components: components as any,
    };
  };

  const createPanelEmbed = (panel: PanelData): EmbedBuilder => {
    const embed = new EmbedBuilder()
      .setTitle(panel.introTitle || panel.title)
      .setDescription(panel.introDescription || panel.content || "Click below to open a ticket")
      .setColor(panel.color ? parseInt(panel.color.replace("#", ""), 16) : 0x5865f2)
      .setTimestamp()
      .setFooter({ text: "ticketsbot.ai" });

    if (panel.imageUrl) {
      embed.setImage(panel.imageUrl);
    }

    if (panel.thumbnailUrl) {
      embed.setThumbnail(panel.thumbnailUrl);
    }

    // Add text sections if present
    if (panel.textSections && Array.isArray(panel.textSections)) {
      for (const section of panel.textSections) {
        if (section.name && section.value) {
          embed.addFields({
            name: section.name,
            value: section.value,
            inline: false,
          });
        }
      }
    }

    return embed;
  };

  const createPanelComponents = (
    panel: PanelData
  ): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] => {
    const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

    if (panel.type === "SINGLE") {
      // Single panel - create button
      const button = new ButtonBuilder()
        .setCustomId(`ticket_create_${panel.id}`)
        .setLabel(panel.buttonText)
        .setStyle(ButtonStyle.Primary);

      if (panel.emoji) {
        button.setEmoji(panel.emoji);
      }

      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button));
    } else if (panel.type === "MULTI" && panel.children) {
      // Multi panel - create select menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`ticket_select_${panel.id}`)
        .setPlaceholder(panel.buttonText || "Select an option")
        .addOptions(
          panel.children.map((child) => ({
            label: child.title,
            value: child.id.toString(),
            description: child.content?.substring(0, 100),
            emoji: child.emoji || undefined,
          }))
        );

      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }

    return rows;
  };

  /**
   * Register event handlers
   */
  export const registerHandlers = (handlers: {
    onTicketCreate?: TicketCreateHandler;
    onTicketClose?: TicketCloseHandler;
    onMessageCreate?: MessageCreateHandler;
  }) => {
    if (handlers.onTicketCreate) onTicketCreate = handlers.onTicketCreate;
    if (handlers.onTicketClose) onTicketClose = handlers.onTicketClose;
    if (handlers.onMessageCreate) onMessageCreate = handlers.onMessageCreate;
  };

  /**
   * Get registered handlers
   */
  export const getHandlers = () => ({
    onTicketCreate,
    onTicketClose,
    onMessageCreate,
  });

  /**
   * Create a ticket channel
   */
  export const createTicketChannel = async (data: {
    guildId: string;
    name: string;
    categoryId?: string;
    topic?: string;
    isThread?: boolean;
    parentChannelId?: string;
  }): Promise<{ channelId: string }> => {
    const client = await getClient();
    const guild = await validateGuild(client, data.guildId);

    if (data.isThread && data.parentChannelId) {
      // Create thread
      const parentChannel = await getTextChannel(guild, data.parentChannelId);
      const thread = await parentChannel.threads.create({
        name: data.name,
        autoArchiveDuration: 1440, // 24 hours
        reason: data.topic,
      });
      return { channelId: thread.id };
    } else {
      // Create text channel
      const channel = await guild.channels.create({
        name: data.name,
        type: ChannelType.GuildText,
        parent: data.categoryId,
        topic: data.topic,
      });
      return { channelId: channel.id };
    }
  };

  /**
   * Delete a ticket channel
   */
  export const deleteTicketChannel = async (guildId: string, channelId: string): Promise<void> => {
    const client = await getClient();
    const guild = await validateGuild(client, guildId);

    try {
      const channel = await guild.channels.fetch(channelId);
      if (channel) {
        await channel.delete();
      }
    } catch (error) {
      console.warn(`Failed to delete channel ${channelId}:`, error);
    }
  };

  /**
   * Send message to a channel
   */
  export const sendMessage = async (
    guildId: string,
    channelId: string,
    content: string | MessageCreateOptions
  ): Promise<{ messageId: string }> => {
    const client = await getClient();
    const guild = await validateGuild(client, guildId);
    const channel = await getTextChannel(guild, channelId);

    const message = await channel.send(typeof content === "string" ? { content } : content);

    return { messageId: message.id };
  };

  /**
   * Check if a channel is a ticket channel (implementation specific)
   */
  export const isTicketChannel = async (guildId: string, channelId: string): Promise<boolean> => {
    // This is a placeholder - actual implementation would check channel name pattern,
    // database records, or channel topic
    const client = await getClient();
    const guild = await validateGuild(client, guildId);

    try {
      const channel = await guild.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) return false;

      // Check if channel name follows ticket pattern (e.g., ticket-123)
      return channel.name.startsWith("ticket-");
    } catch {
      return false;
    }
  };

  /**
   * Get Discord user
   */
  export const getUser = async (userId: string): Promise<User | null> => {
    const client = await getClient();
    try {
      return await client.users.fetch(userId);
    } catch {
      return null;
    }
  };

  /**
   * Get the Discord client (for advanced operations)
   */
  export const getDiscordClient = getClient;

  /**
   * Cleanup Discord client on shutdown
   */
  export const cleanup = async (): Promise<void> => {
    if (client) {
      client.destroy();
      client = null;
      initPromise = null;
      onTicketCreate = null;
      onTicketClose = null;
      onMessageCreate = null;
    }
  };
}

// Register cleanup on process exit
process.on("SIGINT", () => Discord.cleanup());
process.on("SIGTERM", () => Discord.cleanup());

// Export ticket operations
export * from "./ticket-operations";
