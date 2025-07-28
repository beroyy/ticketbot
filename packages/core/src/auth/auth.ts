import { logger } from "./utils/logger";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { prisma } from "../prisma";
import { User as UserDomain, Account as AccountDomain } from "../domains";
import { Redis } from "../redis";
import { getDiscordAvatarUrl } from "./services/discord-api";
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
  const webOrigin = getEnvVar("WEB_URL", "http://localhost:3000");
  const apiOrigin = getEnvVar("API_URL", "http://localhost:3001");

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
      useSecureCookies: false,
      crossSubDomainCookies: {
        enabled: true,
        domain: process.env["NODE_ENV"] === "production" ? ".ticketsbot.co" : "localhost",
      },
      disableCSRFCheck: process.env["NODE_ENV"] === "development",
      cookies: {
        "session_token": {
          name: "session_token",
          attributes: {
            sameSite: "lax",
            secure: true,
            httpOnly: true,
            domain: process.env["NODE_ENV"] === "production" ? ".ticketsbot.co" : "localhost",
            path: "/"
          }
        },
        "session_data": {
          name: "session_data",
          attributes: {
            sameSite: "lax",
            secure: true,
            httpOnly: true,
            domain: process.env["NODE_ENV"] === "production" ? ".ticketsbot.co" : "localhost",
            path: "/"
          }
        }
      }
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
        scope: ["identify", "guilds"],
        mapProfileToUser: (profile: any) => {
          logger.debug("Discord OAuth profile received:", {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            hasAvatar: !!profile.avatar,
          });

          // Calculate avatar URL
          const avatarUrl = getDiscordAvatarUrl(
            profile.id,
            profile.avatar,
            profile.discriminator || "0"
          );

          // Return mapped user data that will be stored
          // Note: discordUserId is NOT set here to avoid foreign key constraint
          // It will be linked after the DiscordUser is created in the callback hook
          return {
            username: profile.username,
            discriminator: profile.discriminator || null,
            avatar_url: avatarUrl,
            name: profile.username, // Update the display name
            email: profile.email || `${profile.id}@discord.local`, // Fallback email
          };
        },
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
        discordDataFetchedAt: {
          type: "date",
          required: false,
          defaultValue: null,
          input: false,
        },
      },
    },
    plugins: [
      customSession(async (sessionData: SessionData) => {
        const { user, session } = sessionData;

        // Quick path: If user already has Discord data and it's fresh, return immediately
        const existingUser = user as any;
        if (
          existingUser.discordUserId &&
          existingUser.username &&
          existingUser.discordDataFetchedAt
        ) {
          const dataAge = Date.now() - new Date(existingUser.discordDataFetchedAt).getTime();
          const MAX_AGE = 30 * 60 * 1000; // 30 minutes

          if (dataAge < MAX_AGE) {
            logger.debug("Using cached Discord data from session", {
              userId: user.id,
              discordUserId: existingUser.discordUserId,
              dataAge: Math.round(dataAge / 1000) + "s",
            });
            return { session, user };
          }
        }

        // Slow path: Fetch Discord data if missing or stale
        const fullUser = await UserDomain.getBetterAuthUser(user.id);
        let discordUser = null;
        if (fullUser?.discordUserId) {
          discordUser = await UserDomain.getDiscordUser(fullUser.discordUserId);
        }

        if (!fullUser) {
          return { session, user };
        }

        let discordUserId = fullUser.discordUserId;

        // Only do the account lookup if we don't have a Discord ID
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
            username: discordUser?.username ?? fullUser.username ?? null,
            discriminator: discordUser?.discriminator ?? fullUser.discriminator ?? null,
            avatar_url: discordUser?.avatarUrl ?? fullUser.avatar_url ?? null,
            discordDataFetchedAt: new Date(),
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

        if (ctx.path && ctx.path.includes("/callback/")) {
          logger.debug("OAuth callback detected", { path: ctx.path });

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

            // First, fetch Discord user info to ensure we have the data
            const discordUserResponse = await fetch("https://discord.com/api/v10/users/@me", {
              headers: {
                Authorization: `Bearer ${account.accessToken}`,
                "User-Agent": "ticketsbot.ai (https://github.com/ticketsbot/ticketsbot, 1.0.0)",
              },
            });

            if (discordUserResponse.ok) {
              const discordProfile = await discordUserResponse.json() as {
                id: string;
                username: string;
                discriminator: string | null;
                avatar: string | null;
              };
              
              // Calculate avatar URL
              const avatarUrl = getDiscordAvatarUrl(
                discordProfile.id,
                discordProfile.avatar,
                discordProfile.discriminator || "0"
              );

              // Ensure DiscordUser exists first
              await UserDomain.ensure(
                account.accountId,
                discordProfile.username,
                discordProfile.discriminator || undefined,
                avatarUrl
              );
              
              logger.debug("Ensured DiscordUser exists", {
                discordId: account.accountId,
                username: discordProfile.username,
              });
            }

            // Now update the Better Auth user with the Discord link
            await prisma.user.update({
              where: { id: user.id },
              data: {
                discordDataFetchedAt: new Date(),
                discordUserId: account.accountId,
              },
            });

            logger.debug("Linked Discord account to user");

            try {
              logger.debug("Fetching user guilds to set ownership...");

              const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
                headers: {
                  Authorization: `Bearer ${account.accessToken}`,
                  "User-Agent": "ticketsbot.ai (https://github.com/ticketsbot/ticketsbot, 1.0.0)",
                },
              });

              if (guildsResponse.ok) {
                const guilds = (await guildsResponse.json()) as Array<{
                  id: string;
                  name: string;
                  icon?: string | null;
                  owner?: boolean;
                  permissions?: string;
                  features?: string[];
                }>;

                // Cache all admin guilds for the user
                const { DiscordCache } = await import("./services/discord-cache");
                const MANAGE_GUILD = BigInt(0x20);
                
                const adminGuilds = guilds
                  .filter((guild) => {
                    if (guild.owner) return true;
                    if (guild.permissions) {
                      return (BigInt(guild.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
                    }
                    return false;
                  })
                  .map((guild) => ({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
                    owner: guild.owner || false,
                    permissions: guild.permissions || "0",
                    features: guild.features || [],
                  }));

                // Cache the guilds immediately
                await DiscordCache.setGuilds(user.id, adminGuilds);
                logger.debug(`Cached ${adminGuilds.length} admin guilds for user during OAuth`);

                // Handle all admin guilds for database setup
                if (adminGuilds.length > 0) {
                  logger.debug(
                    `Found ${adminGuilds.length} admin guilds for user ${account.accountId}`
                  );

                  const { ensure: ensureGuild } = await import("../domains/guild");
                  const { Team } = await import("../domains/team");

                  await Promise.all(
                    adminGuilds.map(async (guild) => {
                      try {
                        // Create guild record - only set owner if they actually own it
                        const ownerId = guild.owner ? account.accountId : undefined;
                        logger.debug(`Processing guild ${guild.id}:`, {
                          guildName: guild.name,
                          isOwner: guild.owner,
                          accountId: account.accountId,
                          ownerId,
                        });
                        await ensureGuild(guild.id, guild.name, ownerId);
                        
                        if (guild.owner) {
                          logger.debug(`Set ownership for guild ${guild.id} (${guild.name}) with Discord ID ${account.accountId}`);
                        } else {
                          logger.debug(`Created guild record for ${guild.id} (${guild.name}) where user is admin but not owner`);
                        }

                        // Invalidate permission cache for this guild
                        if (Redis.isAvailable()) {
                          await Redis.withRetry(
                            async (client) => {
                              let count = 0;
                              for await (const keys of client.scanIterator({
                                MATCH: `perms:${guild.id}:*`,
                                COUNT: 100
                              })) {
                                for (const key of keys) {
                                  if (key && key !== '') {
                                    await client.del(key);
                                    count++;
                                  }
                                }
                              }
                              return count;
                            },
                            `auth.invalidateGuild(${guild.id})`
                          );
                          logger.debug(`Invalidated permission cache for guild ${guild.id}`);
                        }

                        // Ensure default roles exist
                        await Team.ensureDefaultRoles(guild.id);
                        logger.debug(`Ensured default roles exist for guild ${guild.id}`);
                        
                        // Assign appropriate role based on permissions
                        if (guild.owner) {
                          // Owner gets admin role
                          const adminRole = await Team.getRoleByName(guild.id, "admin");
                          if (adminRole) {
                            await Team.assignRole(adminRole.id, account.accountId);
                            logger.debug(`Assigned admin role to guild owner ${account.accountId} in guild ${guild.id}`);
                          }
                        } else {
                          // Non-owner admin gets viewer role by default
                          const viewerRole = await Team.getRoleByName(guild.id, "viewer");
                          if (viewerRole) {
                            await Team.assignRole(viewerRole.id, account.accountId);
                            logger.debug(`Assigned viewer role to admin user ${account.accountId} in guild ${guild.id}`);
                          }
                        }
                      } catch (error) {
                        logger.error(`Failed to setup guild ${guild.id}:`, error);
                      }
                    })
                  );

                  logger.debug("Guild setup completed for all admin guilds");
                } else {
                  logger.debug("No admin guilds found for user");
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
