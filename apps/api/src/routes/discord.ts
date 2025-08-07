import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DiscordGuildIdSchema } from "@ticketsbot/core";
import { Discord } from "@ticketsbot/core/discord";
import { Account, Role, User, findById as findGuildById } from "@ticketsbot/core/domains";
import { ensure as ensureGuild } from "@ticketsbot/core/domains/guild";
import { createRoute } from "../factory";
import { ApiErrors } from "../utils/error-handler";
import { compositions } from "../middleware/context";
import { logger } from "../utils/logger";

const GuildResponse = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.string(),
  features: z.array(z.string()),
  botInstalled: z.boolean().optional(),
  botConfigured: z.boolean().optional(),
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

const _GuildSyncResponse = z.object({
  success: z.boolean(),
  syncedCount: z.number(),
  totalAdminGuilds: z.number(),
  errors: z.array(z.string()).optional(),
});

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner?: boolean;
  features?: string[];
  description?: string;
}

const MANAGE_GUILD_PERMISSION = BigInt(0x20);
const DISCORD_API_BASE = "https://discord.com/api/v10";
const USER_AGENT = "ticketsbot.ai (https://github.com/yourusername/ticketsbot-ai, 1.0.0)";

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

const fetchDiscordAPI = async (path: string, accessToken: string) => {
  logger.debug("Making Discord API request", {
    path,
    hasToken: !!accessToken,
  });

  try {
    const response = await fetch(`${DISCORD_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": USER_AGENT,
      },
    });

    logger.debug("Discord API response", {
      path,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Discord API request failed", {
        path,
        status: response.status,
        statusText: response.statusText,
        errorBody,
      });

      if (response.status === 401) {
        return {
          error: "Discord token invalid, please re-authenticate",
          code: "DISCORD_TOKEN_INVALID",
        };
      }
      if (response.status === 404) {
        throw ApiErrors.notFound("Resource");
      }
      throw new Error(`Discord API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    logger.debug("Discord API request successful", {
      path,
      dataLength: Array.isArray(data) ? data.length : 1,
    });

    return { data };
  } catch (error) {
    logger.error("Discord API request exception", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const discordRoutes = createRoute()
  .get("/guilds", ...compositions.authenticated, async (c) => {
    const user = c.get("user");

    logger.debug("Fetching Discord guilds", {
      userId: user.id,
      discordUserId: user.discordUserId,
      email: user.email,
    });

    const accountResult = await getDiscordAccount(user.id);
    if ("error" in accountResult) {
      logger.warn("Discord account not connected or expired", {
        error: accountResult.error,
        code: accountResult.code,
        userId: user.id,
      });
      return c.json({
        guilds: [],
        connected: false,
        error: accountResult.error ?? null,
        code: accountResult.code ?? null,
      } satisfies z.infer<typeof _GuildsListResponse>);
    }

    logger.debug("Discord account found", {
      hasAccessToken: !!accountResult.account.accessToken,
      expiresAt: accountResult.account.accessTokenExpiresAt?.toISOString(),
    });

    const effectiveDiscordUserId = user.discordUserId || accountResult.account.accountId;

    const discordUser = await User.getDiscordUser(effectiveDiscordUserId);

    let allGuilds: any[] = [];
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    if (discordUser?.guilds && typeof discordUser.guilds === "object") {
      const guildsData = discordUser.guilds as any;
      const fetchedAt = guildsData.fetchedAt ? new Date(guildsData.fetchedAt) : null;

      if (fetchedAt && Date.now() - fetchedAt.getTime() < CACHE_TTL) {
        allGuilds = guildsData.data || [];
        logger.debug("Using cached guilds", {
          cachedGuilds: allGuilds.length,
          cacheAge: Math.round((Date.now() - fetchedAt.getTime()) / 1000) + "s",
          userId: user.id,
        });
      }
    }

    if (allGuilds.length === 0) {
      const result = await fetchDiscordAPI("/users/@me/guilds", accountResult.account.accessToken!);
      if ("error" in result) {
        logger.error("Failed to fetch guilds from Discord API", {
          error: result.error,
          code: result.code,
          userId: user.id,
        });
        return c.json({
          guilds: [],
          connected: false,
          error: result.error ?? null,
          code: result.code ?? null,
        } satisfies z.infer<typeof _GuildsListResponse>);
      }

      const guilds = result.data as DiscordGuild[];

      allGuilds = guilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner || false,
        permissions: guild.permissions || "0",
        features: guild.features || [],
        isAdmin:
          guild.owner ||
          (BigInt(guild.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION,
      }));

      await User.updateGuildsCache(effectiveDiscordUserId, allGuilds);

      logger.debug("Fetched and cached guilds from Discord", {
        totalGuilds: guilds.length,
        adminGuilds: allGuilds.filter((g) => g.isAdmin).length,
        userId: user.id,
      });
    }

    const adminGuilds = allGuilds
      .filter((g) => g.isAdmin)
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        owner: guild.owner || false,
        permissions: guild.permissions,
        features: guild.features || [],
      }));

    const guildsWithBotStatus = await Promise.all(
      adminGuilds.map(async (guild) => {
        const dbGuild = await findGuildById(guild.id);
        const botInstalled = dbGuild?.botInstalled || false;
        const botConfigured = !!(dbGuild && dbGuild.defaultCategoryId);

        return {
          ...guild,
          botInstalled,
          botConfigured,
        };
      })
    );

    logger.info("Successfully fetched Discord guilds", {
      totalGuilds: allGuilds.length,
      adminGuilds: adminGuilds.length,
      withBot: guildsWithBotStatus.filter((g) => g.botInstalled).length,
      userId: user.id,
      effectiveDiscordUserId,
    });

    return c.json({
      guilds: guildsWithBotStatus,
      connected: true,
      error: null,
      code: null,
    } satisfies z.infer<typeof _GuildsListResponse>);
  })

  .post("/guilds/sync", ...compositions.authenticated, async (c) => {
    const user = c.get("user");

    logger.info("Starting guild sync", {
      userId: user.id,
      discordUserId: user.discordUserId,
    });

    const accountResult = await getDiscordAccount(user.id);
    if ("error" in accountResult) {
      logger.warn("Discord account not connected for guild sync", {
        error: accountResult.error,
        userId: user.id,
      });
      return c.json(
        {
          success: false,
          syncedCount: 0,
          totalAdminGuilds: 0,
          errors: [accountResult.error || "Discord account not connected"],
        } satisfies z.infer<typeof _GuildSyncResponse>,
        400
      );
    }

    const effectiveDiscordUserId = user.discordUserId || accountResult.account.accountId;

    const discordUser = await User.getDiscordUser(effectiveDiscordUserId);
    let allGuilds: any[] = [];

    if (discordUser?.guilds && typeof discordUser.guilds === "object") {
      const guildsData = discordUser.guilds as any;
      allGuilds = guildsData.data || [];
      logger.debug("Using cached guilds for sync", {
        cachedGuilds: allGuilds.length,
        userId: user.id,
      });
    } else {
      const result = await fetchDiscordAPI("/users/@me/guilds", accountResult.account.accessToken!);
      if ("error" in result) {
        logger.error("Failed to fetch guilds for sync", {
          error: result.error,
          userId: user.id,
        });
        return c.json(
          {
            success: false,
            syncedCount: 0,
            totalAdminGuilds: 0,
            errors: [result.error || "Failed to fetch guilds from Discord"],
          } satisfies z.infer<typeof _GuildSyncResponse>,
          500
        );
      }

      const guilds = result.data as DiscordGuild[];

      allGuilds = guilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner || false,
        permissions: guild.permissions || "0",
        features: guild.features || [],
        isAdmin:
          guild.owner ||
          (BigInt(guild.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION,
      }));

      await User.updateGuildsCache(effectiveDiscordUserId, allGuilds);
    }

    const adminGuilds = allGuilds.filter((g) => g.isAdmin);

    logger.info("Syncing admin guilds", {
      adminGuildCount: adminGuilds.length,
      userId: user.id,
    });

    let syncedCount = 0;
    const errors: string[] = [];

    for (const guild of adminGuilds) {
      try {
        const dbGuild = await findGuildById(guild.id);

        if (!dbGuild?.botInstalled) {
          logger.debug(`Skipping guild ${guild.id} - bot not installed`, {
            guildName: guild.name,
            userId: user.id,
          });
          continue;
        }

        logger.debug(`Syncing guild ${guild.id}`, {
          guildName: guild.name,
          isOwner: guild.owner,
          userId: user.id,
        });

        if (
          guild.owner &&
          effectiveDiscordUserId &&
          dbGuild.ownerDiscordId !== effectiveDiscordUserId
        ) {
          await ensureGuild(guild.id, guild.name, effectiveDiscordUserId);
          logger.info(`Updated ownership for guild ${guild.id}`, {
            guildName: guild.name,
            ownerId: effectiveDiscordUserId,
          });
        }

        await Role.ensureDefaultRoles(guild.id);

        if (effectiveDiscordUserId) {
          if (guild.owner) {
            const adminRole = await Role.getRoleByName(guild.id, "admin");
            if (adminRole) {
              await Role.assignRole(adminRole.id, effectiveDiscordUserId);
              logger.debug(`Assigned admin role to owner in guild ${guild.id}`, {
                discordUserId: effectiveDiscordUserId,
              });
            }
          } else {
            const viewerRole = await Role.getRoleByName(guild.id, "viewer");
            if (viewerRole) {
              await Role.assignRole(viewerRole.id, effectiveDiscordUserId);
              logger.debug(`Assigned viewer role to admin in guild ${guild.id}`, {
                discordUserId: effectiveDiscordUserId,
              });
            }
          }
        }

        syncedCount++;
      } catch (error) {
        logger.error(`Failed to sync guild ${guild.id}`, error);
        errors.push(
          `Guild ${guild.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    logger.info("Guild sync completed", {
      syncedCount,
      errorCount: errors.length,
      userId: user.id,
    });

    return c.json({
      success: true,
      syncedCount,
      totalAdminGuilds: adminGuilds.length,
      errors: errors.length > 0 ? errors : undefined,
    } satisfies z.infer<typeof _GuildSyncResponse>);
  })

  .get(
    "/guild/:id",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    async (c) => {
      const { id: guildId } = c.req.valid("param");
      const user = c.get("user");

      const accountResult = await getDiscordAccount(user.id);
      if ("error" in accountResult) {
        throw ApiErrors.badRequest(accountResult.error ?? "Discord error");
      }

      const result = await fetchDiscordAPI(
        `/guilds/${guildId}`,
        accountResult.account.accessToken!
      );
      if ("error" in result) {
        throw ApiErrors.badRequest(result.error ?? "Discord API error");
      }

      const guild = result.data as DiscordGuild;

      const dbGuild = await findGuildById(guildId);
      const botInstalled = dbGuild?.botInstalled || false;
      const botConfigured = !!(dbGuild && dbGuild.defaultCategoryId);

      return c.json({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        description: guild.description,
        features: guild.features || [],
        botInstalled,
        botConfigured,
      } satisfies z.infer<typeof _GuildDetailResponse>);
    }
  )

  .get(
    "/guild/:id/roles",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    async (c) => {
      const { id: guildId } = c.req.valid("param");

      const dbGuild = await findGuildById(guildId);
      if (!dbGuild) {
        throw ApiErrors.notFound("Bot is not installed in this guild");
      }

      const roles = await Discord.getGuildRoles(guildId);
      return c.json(roles);
    }
  )

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

      const dbGuild = await findGuildById(guildId);
      if (!dbGuild) {
        throw ApiErrors.notFound("Bot is not installed in this guild");
      }

      const channels = await Discord.getGuildChannels(guildId);

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

  .get(
    "/guild/:id/categories",
    ...compositions.authenticated,
    zValidator("param", z.object({ id: DiscordGuildIdSchema })),
    async (c) => {
      const { id: guildId } = c.req.valid("param");

      const dbGuild = await findGuildById(guildId);
      if (!dbGuild) {
        throw ApiErrors.notFound("Bot is not installed in this guild");
      }

      const categories = await Discord.getGuildCategories(guildId);
      return c.json(categories);
    }
  )

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
