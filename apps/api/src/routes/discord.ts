import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { cacheService, CacheKeys } from "@ticketsbot/core/prisma";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { requireAuth } from "../middleware/context";
import { Discord } from "@ticketsbot/core/discord";
import {
  ensure as ensureGuild,
  findById as findGuildById,
  Account,
} from "@ticketsbot/core/domains";
import type { AuthSession } from "@ticketsbot/core/auth";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
  guildId?: string;
};

export const discord: Hono<{ Variables: Variables }> = new Hono<{ Variables: Variables }>();

// GET /discord/guilds - Get user's Discord guilds
discord.get("/guilds", requireAuth, async (c) => {
  const user = c.get("user");

  // Get Discord account details
  const account = await Account.getDiscordAccount(user.id);

  if (!account?.accessToken) {
    // Return structured error response instead of 400 status
    return c.json(
      {
        error: "Discord account not connected",
        code: "DISCORD_NOT_CONNECTED",
        guilds: [],
        connected: false,
      },
      200
    );
  }

  // Check if token needs refresh
  if (account.accessTokenExpiresAt && account.accessTokenExpiresAt < new Date()) {
    return c.json(
      {
        error: "Discord token expired, please re-authenticate",
        code: "DISCORD_TOKEN_EXPIRED",
        guilds: [],
        connected: false,
      },
      200
    );
  }

  // Fetch guilds from Discord API
  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "User-Agent": "DiscordTickets (https://github.com/yourusername/ticketsbot-ai, 1.0.0)",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return c.json(
        {
          error: "Discord token invalid, please re-authenticate",
          code: "DISCORD_TOKEN_INVALID",
          guilds: [],
          connected: false,
        },
        200
      );
    }
    throw new Error(`Discord API error: ${response.status}`);
  }

  const guilds = (await response.json()) as Array<{
    id: string;
    name: string;
    icon: string | null;
    permissions: string;
    owner?: boolean;
    features?: string[];
  }>;

  // Filter guilds where user has MANAGE_GUILD permission
  const adminGuilds = guilds.filter(
    (guild) => (BigInt(guild.permissions) & BigInt(0x20)) === BigInt(0x20)
  );

  // Format response
  const formattedGuilds = adminGuilds.map((guild) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
    owner: guild.owner || false,
    permissions: guild.permissions,
    features: guild.features || [],
  }));

  // Return consistent response format
  return c.json({
    guilds: formattedGuilds,
    connected: true,
    error: null,
    code: null,
  });
});

// GET /discord/guild/:id - Get specific guild details with bot status
discord.get(
  "/guild/:id",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    const { id: guildId } = c.req.valid("param");
    const user = c.get("user");

    // Get Discord account details
    const account = await Account.getDiscordAccount(user.id);

    if (!account?.accessToken) {
      return c.json({ error: "Discord account not connected" }, 400);
    }

    // Fetch guild details from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "User-Agent": "DiscordTickets (https://github.com/yourusername/ticketsbot-ai, 1.0.0)",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ error: "Guild not found or no access" }, 404);
      }
      throw new Error(`Discord API error: ${response.status}`);
    }

    const guild = (await response.json()) as {
      id: string;
      name: string;
      icon: string | null;
      description?: string;
      features?: string[];
    };

    // Check if bot is in this guild
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
    });
  }
);

// GET /discord/guild/:id/roles - Get guild roles
discord.get(
  "/guild/:id/roles",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    const { id: guildId } = c.req.valid("param");

    // Check if bot is in the guild
    const dbGuild = await findGuildById(guildId);

    if (!dbGuild) {
      return c.json({ error: "Bot is not installed in this guild" }, 404);
    }

    // Get roles using Discord service
    const roles = await Discord.getGuildRoles(guildId);
    return c.json(roles);
  }
);

// GET /discord/guild/:id/channels - Get guild channels
discord.get(
  "/guild/:id/channels",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: DiscordGuildIdSchema,
    })
  ),
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

    // Check if bot is in the guild
    const dbGuild = await findGuildById(guildId);

    if (!dbGuild) {
      return c.json({ error: "Bot is not installed in this guild" }, 404);
    }

    // Get channels using Discord service
    const channels = await Discord.getGuildChannels(guildId);

    // Add a "None" option at the beginning if requested
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
);

// GET /discord/guild/:id/categories - Get guild categories
discord.get(
  "/guild/:id/categories",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    const { id: guildId } = c.req.valid("param");

    // Check if bot is in the guild
    const dbGuild = await findGuildById(guildId);

    if (!dbGuild) {
      return c.json({ error: "Bot is not installed in this guild" }, 404);
    }

    // Get categories using Discord service
    const categories = await Discord.getGuildCategories(guildId);
    return c.json(categories);
  }
);

// GET /discord/guild/:id/permissions - Get bot permissions in guild
discord.get(
  "/guild/:id/permissions",
  requireAuth,
  zValidator(
    "param",
    z.object({
      id: DiscordGuildIdSchema,
    })
  ),
  async (c) => {
    const { id: guildId } = c.req.valid("param");

    try {
      const permissions = await Discord.getBotPermissions(guildId);
      return c.json(permissions);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "not_found" &&
        "message" in error
      ) {
        return c.json({ error: String(error.message) }, 404);
      }
      throw error;
    }
  }
);
