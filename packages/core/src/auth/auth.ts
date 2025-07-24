import { logger } from "./utils/logger";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { prisma } from "../prisma";
import { User as UserDomain, Account as AccountDomain } from "../domains";
import { linkDiscordAccount } from "./services/discord-link";
import { Redis } from "../redis";
import { fetchDiscordUser, getDiscordAvatarUrl } from "./services/discord-api";
import type { User, Session } from "./types";

interface AuthContext {
  newSession?: {
    user: User;
    session: Session;
  };
  user?: User;
}

type SessionData = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null;
  };
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
};

function getEnvVar(key: string, fallback?: string): string {
  return process.env[key] || fallback || "";
}

const getOrigins = () => {
  const webOrigin = getEnvVar("WEB_URL", "http://localhost:4000");
  const apiOrigin = getEnvVar("API_URL", "http://localhost:4001");

  if (!getOrigins.logged) {
    logger.info("Auth trusted origins:", {
      webOrigin,
      apiOrigin,
      envWebUrl: process.env.WEB_URL,
      envApiUrl: process.env.API_URL,
    });
    getOrigins.logged = true;
  }

  return { webOrigin, apiOrigin };
};
getOrigins.logged = false;

let secondaryStorage:
  | {
      get: (key: string) => Promise<string | null>;
      set: (key: string, value: string, ttl?: number) => Promise<void>;
      delete: (key: string) => Promise<void>;
    }
  | undefined = undefined;

if (Redis.isAvailable()) {
  logger.debug("Configuring Better Auth with Redis secondary storage");

  secondaryStorage = {
    get: async (key: string) => {
      try {
        return await Redis.withRetry(async (client) => {
          const value = await client.get(key);
          return value || null;
        }, "secondaryStorage.get");
      } catch (error) {
        logger.warn("Redis get failed, falling back to database:", error);
        return null; // Let Better Auth handle fallback to database
      }
    },
    set: async (key: string, value: string, ttl?: number) => {
      try {
        await Redis.withRetry(async (client) => {
          if (ttl) {
            await client.set(key, value, { EX: ttl });
          } else {
            await client.set(key, value);
          }
        }, "secondaryStorage.set");
      } catch (error) {
        logger.warn("Redis set failed, using database only:", error);
        // Don't throw - allow operation to continue with database
      }
    },
    delete: async (key: string) => {
      try {
        await Redis.withRetry(async (client) => {
          await client.del(key);
        }, "secondaryStorage.delete");
      } catch (error) {
        logger.warn("Redis delete failed:", error);
        // Non-critical operation - continue without throwing
      }
    },
  };
}

const authSecret = getEnvVar("BETTER_AUTH_SECRET");
if (!authSecret) {
  logger.error("BETTER_AUTH_SECRET is not set! Sessions will not work properly.");
}

const discordClientId = getEnvVar("DISCORD_CLIENT_ID");
const discordClientSecret = getEnvVar("DISCORD_CLIENT_SECRET");

if (!discordClientId || !discordClientSecret) {
  logger.warn("Discord OAuth credentials not set. OAuth login will not work.", {
    clientIdSet: !!discordClientId,
    clientSecretSet: !!discordClientSecret,
  });
}

interface AuthInstance {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (params: { headers: Headers }) => Promise<unknown>;
    [key: string]: unknown;
  };
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

const createAuthInstance = () => {
  const { webOrigin, apiOrigin } = getOrigins();

  logger.debug("Creating Better Auth instance", {
    baseURL: apiOrigin,
    basePath: "/auth",
    discordConfigured: !!discordClientId && !!discordClientSecret,
    redirectURI: `${apiOrigin}/auth/callback/discord`,
    discordClientId: discordClientId?.substring(0, 6) + "...",
    nodeEnv: process.env["NODE_ENV"],
  });

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    secret: authSecret,
    ...(secondaryStorage && { secondaryStorage }),
    session: {
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: parseInt(process.env["COOKIE_CACHE_MAX_AGE"] || "300"),
      },
      expiresIn: 60 * 60 * 24 * 7,
    },
    rateLimit: {
      enabled:
        process.env["NODE_ENV"] === "production" || process.env["RATE_LIMIT_ENABLED"] === "true",
      window: parseInt(process.env["RATE_LIMIT_WINDOW"] || "60"),
      max: parseInt(process.env["RATE_LIMIT_MAX"] || "100"),
      storage: Redis.isAvailable() ? "secondary-storage" : "memory",
      customRules: {
        "/auth/signin": { window: 300, max: 5 },
        "/auth/signup": { window: 300, max: 3 },
        "/auth/callback/*": { window: 60, max: 10 },
        "/auth/forgot-password": { window: 900, max: 3 },
        "/auth/reset-password": { window: 300, max: 5 },
        "/auth/me": { window: 60, max: 30 },
      },
    },
    baseURL: apiOrigin,
    basePath: "/auth",
    trustedOrigins: [webOrigin, apiOrigin],
    advanced: {
      cookiePrefix: "ticketsbot",
      useSecureCookies: process.env["NODE_ENV"] === "production",
      crossSubDomainCookies: {
        enabled: true,
        domain: process.env["COOKIE_DOMAIN"] || "localhost",
      },
      disableCSRFCheck: process.env["NODE_ENV"] === "development",
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["discord"],
      },
    },
    socialProviders: {
      discord: {
        clientId: discordClientId,
        clientSecret: discordClientSecret,
        scope: ["identify", "email", "guilds"],
      },
    },
    user: {
      additionalFields: {
        username: {
          type: "string",
          required: false,
          defaultValue: null,
        },
        discriminator: {
          type: "string",
          required: false,
          defaultValue: null,
        },
        avatar_url: {
          type: "string",
          required: false,
          defaultValue: null,
        },
        discordUserId: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
      },
    },
    plugins: [
      customSession(async (sessionData: SessionData) => {
        const { user, session } = sessionData;
        const fullUser = await UserDomain.getBetterAuthUser(user.id);
        let discordUser = null;
        if (fullUser?.discordUserId) {
          discordUser = await UserDomain.getDiscordUser(fullUser.discordUserId);
        }

        if (!fullUser) {
          return { session, user };
        }

        let discordUserId = fullUser.discordUserId;

        if (!discordUserId) {
          const discordAccount = await AccountDomain.getDiscordAccount(user.id);

          if (discordAccount?.accountId) {
            discordUserId = discordAccount.accountId;

            await UserDomain.ensure(
              discordAccount.accountId,
              `User_${discordAccount.accountId.slice(-6)}`,
              undefined,
              undefined,
              { source: "customSession" }
            );

            await UserDomain.updateDiscordUserId(user.id, discordAccount.accountId);

            discordUser = await UserDomain.getDiscordUser(discordAccount.accountId);
          }
        }

        return {
          session,
          user: {
            ...user,
            discordUserId: discordUserId ?? null,
            username: discordUser?.username ?? null,
            discriminator: discordUser?.discriminator ?? null,
            avatar_url: discordUser?.avatarUrl ?? null,
          },
        };
      }),
    ],
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        logger.debug("Auth Hook - Path:", ctx.path);

        if (ctx.path && ctx.path.includes("/sign-in/social")) {
          logger.info("OAuth sign-in request detected", {
            path: ctx.path,
            method: ctx.method,
          });
        }

        if (ctx.path && ctx.path.includes("/sign-in/social")) {
          logger.info("OAuth sign-in request detected", {
            path: ctx.path,
            method: ctx.method,
          });
        }

        if (ctx.path && ctx.path.includes("/callback/discord")) {
          logger.debug("Discord OAuth callback detected");

          const contextData = ctx.context as AuthContext;
          const user = contextData?.newSession?.user || contextData?.user;

          if (!user) {
            logger.debug("No user found in context after Discord callback");
            return;
          }

          logger.debug("User found after Discord callback:", user.id);

          try {
            const account = await AccountDomain.getDiscordAccount(user.id);

            logger.debug("Discord account found:", account?.accountId);

            if (!account?.accountId || !account.accessToken) {
              logger.debug("No account or access token found");
              return;
            }

            const discordUser = await fetchDiscordUser(account.accessToken);

            if (!discordUser) {
              logger.debug("Failed to fetch Discord user data");
              return;
            }

            logger.debug("Fetched Discord user data:", {
              id: discordUser.id,
              username: discordUser.username,
              discriminator: discordUser.discriminator,
            });

            const avatarUrl = getDiscordAvatarUrl(
              discordUser.id,
              discordUser.avatar,
              discordUser.discriminator
            );

            await linkDiscordAccount(user.id, account.accountId, {
              username: discordUser.username,
              discriminator: discordUser.discriminator,
              avatarUrl: avatarUrl,
            });

            logger.debug("Discord account linked successfully with full profile data");

            try {
              logger.debug("Fetching user guilds to set ownership...");

              const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
                headers: {
                  Authorization: `Bearer ${account.accessToken}`,
                  "User-Agent": "DiscordTickets (https://github.com/ticketsbot/ticketsbot, 1.0.0)",
                },
              });

              if (guildsResponse.ok) {
                const guilds = (await guildsResponse.json()) as Array<{
                  id: string;
                  name: string;
                  owner?: boolean;
                }>;

                const ownedGuilds = guilds.filter((g) => g.owner);

                if (ownedGuilds.length > 0) {
                  logger.debug(
                    `Found ${ownedGuilds.length} owned guilds for user ${account.accountId}`
                  );

                  const { ensure: ensureGuild } = await import("../domains/guild");

                  await Promise.all(
                    ownedGuilds.map(async (guild) => {
                      try {
                        await ensureGuild(guild.id, guild.name, account.accountId);
                        logger.debug(`Set ownership for guild ${guild.id} (${guild.name})`);

                        const { cacheService, CacheKeys } = await import(
                          "../prisma/services/cache"
                        );
                        const deletedCount = cacheService.deletePattern(
                          CacheKeys.guildPattern(guild.id)
                        );
                        logger.debug(
                          `Invalidated ${deletedCount} cached entries for guild ${guild.id}`
                        );

                        const { Team } = await import("../domains/team");
                        await Team.ensureDefaultRoles(guild.id);
                        logger.debug(`Ensured default roles exist for guild ${guild.id}`);
                      } catch (error) {
                        logger.error(`Failed to set ownership for guild ${guild.id}:`, error);
                      }
                    })
                  );

                  logger.debug("Guild ownership setup completed");
                } else {
                  logger.debug("No owned guilds found for user");
                }
              } else {
                logger.warn("Failed to fetch user guilds during auth:", guildsResponse.status);
              }
            } catch (error) {
              logger.error("Error setting up guild ownership during auth:", error);
            }
          } catch (error) {
            logger.error("Error linking Discord account:", error);
          }
        }
      }),
    },
  }) as AuthInstance;
};

let authInstance: AuthInstance | null = null;

export const auth = new Proxy({} as AuthInstance, {
  get(target, prop) {
    if (!authInstance) {
      authInstance = createAuthInstance();
    }
    return authInstance[prop as keyof AuthInstance];
  },
});

export { getSessionFromContext } from "./services/session";

export default auth;
