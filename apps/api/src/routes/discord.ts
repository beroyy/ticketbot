import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { Discord } from "@ticketsbot/core/discord";
import { Account, findById as findGuildById } from "@ticketsbot/core/domains";
import { createRoute, ApiErrors } from "../factory";
import { compositions } from "../middleware/factory-middleware";

// Response schemas
const GuildResponse = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.string(),
  features: z.array(z.string()),
});

const _GuildsListResponse = z.object({
  guilds: z.array(GuildResponse),
  connected: z.boolean(),
  error: z.string().nullable(),
  code: z.string().nullable(),
});

const _GuildDetailResponse = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  description: z.string().optional(),
  features: z.array(z.string()),
  botInstalled: z.boolean(),
  botConfigured: z.boolean(),
});

const _ChannelResponse = z.object({
  id: z.string().nullable(),
  name: z.string(),
  type: z.number().nullable(),
  parentId: z.string().nullable(),
});

// Discord API types
interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner?: boolean;
  features?: string[];
  description?: string;
}

// Constants
const MANAGE_GUILD_PERMISSION = BigInt(0x20);
const DISCORD_API_BASE = "https://discord.com/api/v10";
const USER_AGENT = "DiscordTickets (https://github.com/yourusername/ticketsbot-ai, 1.0.0)";

// Helper to check Discord account
const getDiscordAccount = async (userId: string) => {
  const account = await Account.getDiscordAccount(userId);

  if (!account?.accessToken) {
    return { error: "Discord account not connected", code: "DISCORD_NOT_CONNECTED" };
  }

  if (account.accessTokenExpiresAt && account.accessTokenExpiresAt < new Date()) {
    return {
      error: "Discord token expired, please re-authenticate",
      code: "DISCORD_TOKEN_EXPIRED",
    };
  }

  return { account };
};

// Helper to make Discord API requests
const fetchDiscordAPI = async (path: string, accessToken: string) => {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return {
        error: "Discord token invalid, please re-authenticate",
        code: "DISCORD_TOKEN_INVALID",
      };
    }
    if (response.status === 404) {
      throw ApiErrors.notFound("Resource");
    }
    throw new Error(`Discord API error: ${response.status}`);
  }

  return { data: await response.json() };
};

// Create Discord routes using method chaining
export const discordRoutes = createRoute()
  // Get user's Discord guilds
  .get("/guilds", ...compositions.authenticated, async (c) => {
    const user = c.get("user");

    // Check Discord account
    const accountResult = await getDiscordAccount(user.id);
    if ("error" in accountResult) {
      return c.json({
        guilds: [],
        connected: false,
        error: accountResult.error ?? null,
        code: accountResult.code ?? null,
      } satisfies z.infer<typeof _GuildsListResponse>);
    }

    // Fetch guilds from Discord
    const result = await fetchDiscordAPI("/users/@me/guilds", accountResult.account.accessToken!);
    if ("error" in result) {
      return c.json({
        guilds: [],
        connected: false,
        error: result.error ?? null,
        code: result.code ?? null,
      } satisfies z.infer<typeof _GuildsListResponse>);
    }

    const guilds = result.data as DiscordGuild[];

    // Filter guilds where user has MANAGE_GUILD permission
    const adminGuilds = guilds
      .filter(
        (guild) => (BigInt(guild.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION
      )
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        owner: guild.owner || false,
        permissions: guild.permissions,
        features: guild.features || [],
      }));

    return c.json({
      guilds: adminGuilds,
      connected: true,
      error: null,
      code: null,
    } satisfies z.infer<typeof _GuildsListResponse>);
  })

  // Get specific guild details with bot status
  .get(
    "/guild/:id",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    async (c) => {
      const { id: guildId } = c.req.valid("param");
      const user = c.get("user");

      // Check Discord account
      const accountResult = await getDiscordAccount(user.id);
      if ("error" in accountResult) {
        throw ApiErrors.badRequest(accountResult.error ?? "Discord error");
      }

      // Fetch guild details
      const result = await fetchDiscordAPI(
        `/guilds/${guildId}`,
        accountResult.account.accessToken!
      );
      if ("error" in result) {
        throw ApiErrors.badRequest(result.error ?? "Discord API error");
      }

      const guild = result.data as DiscordGuild;

      // Check bot status in parallel
      const [dbGuild, botInGuild] = await Promise.all([
        findGuildById(guildId),
        Discord.isInGuild(guildId),
      ]);

      return c.json({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        description: guild.description,
        features: guild.features || [],
        botInstalled: botInGuild,
        botConfigured: !!(dbGuild && dbGuild.defaultCategoryId),
      } satisfies z.infer<typeof _GuildDetailResponse>);
    }
  )

  // Get guild roles
  .get(
    "/guild/:id/roles",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    async (c) => {
      const { id: guildId } = c.req.valid("param");

      // Verify bot is in guild
      const dbGuild = await findGuildById(guildId);
      if (!dbGuild) {
        throw ApiErrors.notFound("Bot is not installed in this guild");
      }

      // Get roles using Discord service
      const roles = await Discord.getGuildRoles(guildId);
      return c.json(roles);
    }
  )

  // Get guild channels
  .get(
    "/guild/:id/channels",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    zValidator(
      "query",
      z.object({
        includeNone: z
          .string()
          .optional()
          .default("true")
          .transform((val) => val !== "false"),
      })
    ),
    async (c) => {
      const { id: guildId } = c.req.valid("param");
      const { includeNone } = c.req.valid("query");

      // Verify bot is in guild
      const dbGuild = await findGuildById(guildId);
      if (!dbGuild) {
        throw ApiErrors.notFound("Bot is not installed in this guild");
      }

      // Get channels
      const channels = await Discord.getGuildChannels(guildId);

      // Add "None" option if requested
      if (includeNone) {
        return c.json([
          {
            id: null,
            name: "None",
            type: null,
            parentId: null,
          },
          ...channels,
        ]);
      }

      return c.json(channels);
    }
  )

  // Get guild categories
  .get(
    "/guild/:id/categories",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    async (c) => {
      const { id: guildId } = c.req.valid("param");

      // Verify bot is in guild
      const dbGuild = await findGuildById(guildId);
      if (!dbGuild) {
        throw ApiErrors.notFound("Bot is not installed in this guild");
      }

      // Get categories
      const categories = await Discord.getGuildCategories(guildId);
      return c.json(categories);
    }
  )

  // Get bot permissions in guild
  .get(
    "/guild/:id/permissions",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    async (c) => {
      const { id: guildId } = c.req.valid("param");

      try {
        const permissions = await Discord.getBotPermissions(guildId);
        return c.json(permissions);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "not_found") {
          throw ApiErrors.notFound("Guild");
        }
        throw error;
      }
    }
  );
