import { logger } from "./utils/logger";

// Environment variables should already be loaded by the application
// The auth package doesn't need to load them again

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

// Type for Better Auth context
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

// Lazy initialization of origins to ensure environment variables are loaded
const getOrigins = () => {
  const webOrigin = process.env.WEB_URL || "http://localhost:10000";
  const apiOrigin = process.env.API_URL || "http://localhost:10001";
  
  // Log only once when first accessed
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

// Set up Redis secondary storage if available
let secondaryStorage:
  | {
      get: (key: string) => Promise<string | null>;
      set: (key: string, value: string, ttl?: number) => Promise<void>;
      delete: (key: string) => Promise<void>;
    }
  | undefined = undefined;

if (Redis.isAvailable()) {
  logger.debug("Configuring Better Auth with Redis secondary storage");

  // Secondary storage for sessions and rate limiting
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

// Validate auth secret
const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret) {
  logger.error("BETTER_AUTH_SECRET is not set! Sessions will not work properly.");
}

// Create auth directly without wrapper function
// Define a properly typed auth instance
interface AuthInstance {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (params: { headers: Headers }) => Promise<unknown>;
    [key: string]: unknown;
  };
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

// Create auth with lazy-loaded configuration
const createAuthInstance = () => {
  const { webOrigin, apiOrigin } = getOrigins();
  
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    secret: authSecret,
    ...(secondaryStorage && { secondaryStorage }),
    session: {
      storeSessionInDatabase: true, // Store in DB for audit trail
      cookieCache: {
        enabled: true, // Always use cookie cache for better performance
        maxAge: parseInt(process.env["COOKIE_CACHE_MAX_AGE"] || "300"), // Default: 5 minutes
      },
      expiresIn: 60 * 60 * 24 * 7, // 7 days session expiry
    },
    rateLimit: {
      enabled:
        process.env["NODE_ENV"] === "production" || process.env["RATE_LIMIT_ENABLED"] === "true",
      window: parseInt(process.env["RATE_LIMIT_WINDOW"] || "60"), // Default: 1 minute
      max: parseInt(process.env["RATE_LIMIT_MAX"] || "100"), // Default: 100 requests
      storage: Redis.isAvailable() ? "secondary-storage" : "memory", // Use secondary storage if Redis available
      customRules: {
        // Strict limits for authentication endpoints
        "/auth/signin": { window: 300, max: 5 }, // 5 attempts per 5 minutes
        "/auth/signup": { window: 300, max: 3 }, // 3 signups per 5 minutes
        "/auth/callback/*": { window: 60, max: 10 }, // 10 OAuth callbacks per minute

        // Password reset and sensitive operations
        "/auth/forgot-password": { window: 900, max: 3 }, // 3 attempts per 15 minutes
        "/auth/reset-password": { window: 300, max: 5 }, // 5 attempts per 5 minutes

        // Moderate limits for authenticated endpoints
        "/api/auth/me": { window: 60, max: 30 }, // 30 requests per minute
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
    // Ensure accounts can only be linked by the authenticated user
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord"],
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
        redirectURI: `${apiOrigin}/auth/callback/discord`,
      scope: ["identify", "guilds"],
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
        input: false, // Don't allow user input for this field
      },
    },
  },
  plugins: [
    customSession(async (sessionData: SessionData) => {
      const { user, session } = sessionData;
      // Get the full user data from database
      const fullUser = await UserDomain.getBetterAuthUser(user.id);
      let discordUser = null;
      if (fullUser?.discordUserId) {
        discordUser = await UserDomain.getDiscordUser(fullUser.discordUserId);
      }

      if (!fullUser) {
        return { session, user };
      }

      // Ensure we have the Discord user ID
      let discordUserId = fullUser.discordUserId;

      // If not in the user object, check if there's a linked Discord account
      if (!discordUserId) {
        const discordAccount = await AccountDomain.getDiscordAccount(user.id);

        if (discordAccount?.accountId) {
          discordUserId = discordAccount.accountId;

          // Ensure Discord user exists before linking
          // Use a placeholder username that will be updated by the OAuth callback
          await UserDomain.ensure(
            discordAccount.accountId,
            `User_${discordAccount.accountId.slice(-6)}`, // Temporary username
            undefined,
            undefined,
            { source: "customSession" }
          );

          // Update the user record for future sessions
          await UserDomain.updateDiscordUserId(user.id, discordAccount.accountId);

          // Fetch the Discord user data
          discordUser = await UserDomain.getDiscordUser(discordAccount.accountId);
        }
      }

      // Return enriched session with Discord data
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
      // Log all hooks for debugging
      logger.debug("Auth Hook - Path:", ctx.path);

      // Handle Discord OAuth callback
      if (ctx.path && ctx.path.includes("/callback/discord")) {
        logger.debug("Discord OAuth callback detected");

        // For new sign-ups/sign-ins, the user will be in newSession
        const contextData = ctx.context as AuthContext;
        const user = contextData?.newSession?.user || contextData?.user;

        if (!user) {
          logger.debug("No user found in context after Discord callback");
          return;
        }

        logger.debug("User found after Discord callback:", user.id);

        try {
          // Get the Discord account that was just linked
          const account = await AccountDomain.getDiscordAccount(user.id);

          logger.debug("Discord account found:", account?.accountId);

          if (!account?.accountId || !account.accessToken) {
            logger.debug("No account or access token found");
            return;
          }

          // Fetch Discord user data using the access token
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

          // Get the avatar URL
          const avatarUrl = getDiscordAvatarUrl(
            discordUser.id,
            discordUser.avatar,
            discordUser.discriminator
          );

          // Use our dedicated function to link Discord account with complete data
          await linkDiscordAccount(user.id, account.accountId, {
            username: discordUser.username,
            discriminator: discordUser.discriminator,
            avatarUrl: avatarUrl,
          });

          logger.debug("Discord account linked successfully with full profile data");

          // Fetch user's guilds to set guild ownership
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

              // Find guilds where user is owner
              const ownedGuilds = guilds.filter((g) => g.owner);

              if (ownedGuilds.length > 0) {
                logger.debug(
                  `Found ${ownedGuilds.length} owned guilds for user ${account.accountId}`
                );

                // Import guild domain to set ownership
                const { ensure: ensureGuild } = await import("../domains/guild");

                // Set ownership for each guild
                await Promise.all(
                  ownedGuilds.map(async (guild) => {
                    try {
                      await ensureGuild(guild.id, guild.name, account.accountId);
                      logger.debug(`Set ownership for guild ${guild.id} (${guild.name})`);

                      // Invalidate permission caches for this guild
                      const { cacheService, CacheKeys } = await import("../prisma/services/cache");
                      const deletedCount = cacheService.deletePattern(
                        CacheKeys.guildPattern(guild.id)
                      );
                      logger.debug(
                        `Invalidated ${deletedCount} cached entries for guild ${guild.id}`
                      );

                      // Ensure default team roles exist for this guild
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
            // Don't throw - allow login to continue even if guild setup fails
          }
        } catch (error) {
          logger.error("Error linking Discord account:", error);
          // Don't throw - allow login to continue even if linking fails
        }
      }
    }),
  },
  }) as AuthInstance;
};

// Create a lazy-loaded auth instance
let authInstance: AuthInstance | null = null;

export const auth = new Proxy({} as AuthInstance, {
  get(target, prop) {
    if (!authInstance) {
      authInstance = createAuthInstance();
    }
    return authInstance[prop as keyof AuthInstance];
  },
});

// Re-export getSessionFromContext from services/session
export { getSessionFromContext } from "./services/session";

// Export auth instance
export default auth;
