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
} from "discord.js";

export class VisibleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "VisibleError";
  }
}

type PanelData = {
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
  textSections?: Array<{ name: string; value: string }>;
  mentionRoles?: string[];
  form?: unknown;
  children?: PanelData[];
};

type DeploymentResult = {
  messageId: string;
  channelId: string;
};

let client: Client | null = null;
let initPromise: Promise<Client> | null = null;

const getClient = async (): Promise<Client> => {
  if (client?.isReady()) {
    return client;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = initializeClient();
  client = await initPromise;
  initPromise = null;

  return client;
};

const initializeClient = async (): Promise<Client> => {
  const newClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  newClient.on("error", (error) => {
    console.error("Discord client error:", error);
  });

  newClient.on("warn", (warning) => {
    console.warn("Discord client warning:", warning);
  });

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
    const button = new ButtonBuilder()
      .setCustomId(`ticket_create_${panel.id}`)
      .setLabel(panel.buttonText)
      .setStyle(ButtonStyle.Primary);

    if (panel.emoji) {
      button.setEmoji(panel.emoji);
    }

    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button));
  } else if (panel.type === "MULTI" && panel.children) {
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

const createPanelMessage = (panel: PanelData): MessageCreateOptions => {
  const embed = createPanelEmbed(panel);
  const components = createPanelComponents(panel);

  return {
    embeds: [embed],
    components: components as any,
  };
};

export const deployPanel = async (panel: PanelData): Promise<DeploymentResult> => {
  const client = await getClient();
  const guild = await validateGuild(client, panel.guildId);
  const channel = await getTextChannel(guild, panel.channelId);
  await checkChannelPermissions(channel);

  const messageOptions = createPanelMessage(panel);
  const message = await channel.send(messageOptions);

  return {
    messageId: message.id,
    channelId: channel.id,
  };
};

export const updatePanel = async (
  panel: PanelData,
  messageId: string
): Promise<DeploymentResult> => {
  const client = await getClient();
  const guild = await validateGuild(client, panel.guildId);
  const channel = await getTextChannel(guild, panel.channelId);
  await checkChannelPermissions(channel);

  const message = await channel.messages.fetch(messageId).catch(() => null);

  if (!message) {
    throw new VisibleError("not_found", "Panel message not found");
  }

  const { embeds, components } = createPanelMessage(panel);
  await message.edit({ embeds, components });

  return {
    messageId: message.id,
    channelId: channel.id,
  };
};

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

export const getGuildCategories = async (guildId: string) => {
  const client = await getClient();
  const guild = await validateGuild(client, guildId);

  const categories = guild.channels.cache
    .filter((channel) => channel.type === 4)
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return categories;
};

export const getGuildRoles = async (guildId: string) => {
  const client = await getClient();
  const guild = await validateGuild(client, guildId);

  const roles = guild.roles.cache
    .filter((role) => !role.managed && role.id !== guild.id)
    .map((role) => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
    }))
    .sort((a, b) => b.position - a.position);

  return roles;
};

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

export const cleanup = async (): Promise<void> => {
  if (client) {
    client.destroy();
    client = null;
    initPromise = null;
  }
};

process.on("SIGINT", () => cleanup());
process.on("SIGTERM", () => cleanup());