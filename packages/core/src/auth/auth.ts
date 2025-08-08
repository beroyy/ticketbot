import { logger } from "./utils/logger";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { prisma } from "@ticketsbot/db";
import { User } from "../domains/user";
import { Account } from "../domains/account";
import { getDiscordAvatarUrl } from "./services/discord-api";
import type { User as AuthUser, Session } from "./types";

type AuthContext = {
  newSession?: {
    user: AuthUser;
    session: Session;
  };
  user?: AuthUser;
};

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

  if (!getOrigins.logged) {
    logger.info("Auth trusted origins:", {
      webOrigin,
      envWebUrl: process.env.WEB_URL,
    });
    getOrigins.logged = true;
  }

  return { webOrigin };
};
getOrigins.logged = false;

// No longer using Redis for secondary storage - database only

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

type AuthInstance = {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (params: { headers: Headers }) => Promise<unknown>;
    [key: string]: unknown;
  };
  options?: Record<string, unknown>;
  [key: string]: unknown;
};

// Singleton auth instance
let authInstance: AuthInstance | null = null;

const createAuthInstance = (): AuthInstance => {
  // Return existing instance if already created
  if (authInstance) {
    return authInstance;
  }

  const { webOrigin } = getOrigins();

  const cookieDomain = process.env.NODE_ENV === "production" ? ".ticketsbot.co" : "localhost";

  logger.info("Creating Better Auth instance (singleton)", {
    discordConfigured: !!discordClientId && !!discordClientSecret,
    redirectURI: `${webOrigin}/api/auth/callback/discord`,
    discordClientId: discordClientId?.substring(0, 6) + "...",
    nodeEnv: process.env["NODE_ENV"],
  });

  authInstance = betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    secret: authSecret,
    session: {
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 3600,  // 1 hour cache
      },
      expiresIn: 60 * 60 * 24 * 7,
    },
    rateLimit: {
      enabled: process.env["NODE_ENV"] === "production",
      window: 60,
      max: 100,
      storage: "memory",
      customRules: {
        "/api/auth/signin": { window: 300, max: 5 },
        "/api/auth/signup": { window: 300, max: 3 },
        "/api/auth/callback/*": { window: 60, max: 10 },
        "/api/auth/forgot-password": { window: 900, max: 3 },
        "/api/auth/reset-password": { window: 300, max: 5 },
        "/api/auth/me": { window: 60, max: 30 },
      },
    },
    trustedOrigins: [webOrigin],
    advanced: {
      // cookiePrefix: "ticketsbot",
      useSecureCookies: process.env["NODE_ENV"] === "production",
      crossSubDomainCookies: {
        enabled: true,
        domain: cookieDomain,
      },
      disableCSRFCheck: process.env["NODE_ENV"] === "development",
      cookies: {
        session_token: {
          name: "session_token",
          attributes: {
            sameSite: "lax",
            secure: process.env["NODE_ENV"] === "production",
            httpOnly: true,
            domain: cookieDomain,
            path: "/",
          },
        },
        session_data: {
          name: "session_data",
          attributes: {
            sameSite: "lax",
            secure: process.env["NODE_ENV"] === "production",
            httpOnly: true,
            domain: cookieDomain,
            path: "/",
          },
        },
      },
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

          return {
            name: profile.username,
            email: profile.email,
          };
        },
      },
    },
    user: {
      additionalFields: {
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

        const existingUser = user as any;
        
        // Fast path: If we already have Discord data, return immediately
        if (existingUser.discordUserId && existingUser.username) {
          return { session, user };
        }

        // Slow path: Only fetch if truly missing Discord data
        logger.debug("customSession fetching missing Discord data", {
          userId: user.id,
          hasDiscordUserId: !!existingUser.discordUserId,
          hasUsername: !!existingUser.username,
        });

        const fullUser = await User.getBetterAuthUser(user.id);
        logger.debug("Fetched full user from DB", {
          userId: user.id,
          hasDiscordUserId: !!fullUser?.discordUserId,
          discordUserId: fullUser?.discordUserId,
        });

        let discordUser = null;
        if (fullUser?.discordUserId) {
          discordUser = await User.getDiscordUser(fullUser.discordUserId);
          logger.debug("Fetched Discord user", {
            discordUserId: fullUser.discordUserId,
            username: discordUser?.username,
          });
        }

        if (!fullUser) {
          logger.warn("No full user found in DB", { userId: user.id });
          return { session, user };
        }

        let discordUserId = fullUser.discordUserId;

        // Only do the account lookup if we don't have a Discord ID
        if (!discordUserId) {
          logger.debug("No Discord ID on user, checking OAuth accounts", { userId: user.id });
          const discordAccount = await Account.getDiscordAccount(user.id);
          logger.debug("Discord OAuth account lookup result", {
            userId: user.id,
            found: !!discordAccount,
            accountId: discordAccount?.accountId,
          });

          if (discordAccount?.accountId) {
            discordUserId = discordAccount.accountId;

            await User.ensure(
              discordAccount.accountId,
              `User_${discordAccount.accountId.slice(-6)}`,
              undefined,
              undefined,
              { source: "customSession" }
            );

            await User.updateDiscordUserId(user.id, discordAccount.accountId);
            logger.info("Updated user with Discord ID from OAuth account", {
              userId: user.id,
              discordUserId: discordAccount.accountId,
            });

            discordUser = await User.getDiscordUser(discordAccount.accountId);
          }
        }

        const enhancedUser = {
          ...user,
          discordUserId: discordUserId ?? null,
          username: discordUser?.username ?? null,
          discriminator: discordUser?.discriminator ?? null,
          avatar_url: discordUser?.avatarUrl ?? null,
        };

        logger.debug("customSession returning enhanced user", {
          userId: user.id,
          hasDiscordUserId: !!enhancedUser.discordUserId,
          discordUserId: enhancedUser.discordUserId,
          username: enhancedUser.username,
        });

        return {
          session,
          user: enhancedUser,
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
            const account = await Account.getDiscordAccount(user.id);

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
              const discordProfile = (await discordUserResponse.json()) as {
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
              await User.ensure(
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
                discordUserId: account.accountId,
              },
            });

            logger.debug("Linked Discord account to user");

            // Force session refresh by invalidating cache
            // This ensures the customSession plugin re-runs on next request
            try {
              // Clear any cached session data to force refresh
              logger.info("Forcing session refresh after Discord link");
            } catch (e) {
              logger.error("Failed to clear session cache:", e);
            }

            try {
              logger.debug("Fetching user guilds to cache...");

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

                // Mark which guilds user can administrate
                const MANAGE_GUILD = BigInt(0x20);

                const guildsWithAdminStatus = guilds.map((guild) => ({
                  id: guild.id,
                  name: guild.name,
                  icon: guild.icon,
                  owner: guild.owner || false,
                  permissions: guild.permissions || "0",
                  features: guild.features || [],
                  isAdmin:
                    guild.owner ||
                    (guild.permissions
                      ? (BigInt(guild.permissions) & MANAGE_GUILD) === MANAGE_GUILD
                      : false),
                }));

                // Cache all guilds in DiscordUser
                await prisma.discordUser.update({
                  where: { id: account.accountId },
                  data: {
                    guilds: {
                      data: guildsWithAdminStatus,
                      fetchedAt: new Date().toISOString(),
                    },
                  },
                });

                logger.debug(`Cached ${guilds.length} guilds for user during OAuth`, {
                  totalGuilds: guilds.length,
                  adminGuilds: guildsWithAdminStatus.filter((g) => g.isAdmin).length,
                  discordUserId: account.accountId,
                });

                // Only set up ownership and roles for guilds where bot is installed
                const guildModule = await import("../domains/guild/system");
                const findGuildById = guildModule.getGuildById;
                const ensureGuild = guildModule.ensureGuild;
                const roleModule = await import("../domains/role");
                const Role = roleModule.Role;

                const adminGuilds = guildsWithAdminStatus.filter((g) => g.isAdmin);

                for (const guild of adminGuilds) {
                  try {
                    // Check if bot is in this guild
                    const dbGuild = await findGuildById(guild.id);

                    if (dbGuild?.botInstalled) {
                      logger.debug(
                        `Bot is installed in guild ${guild.id}, setting up ownership and roles`
                      );

                      // Update ownership if they own it
                      if (guild.owner && dbGuild.ownerDiscordId !== account.accountId) {
                        await ensureGuild(guild.id, guild.name, account.accountId);
                        logger.debug(`Updated ownership for guild ${guild.id}`);
                      }

                      // Ensure default roles exist
                      await Role.ensureDefaultRoles(guild.id);

                      // Assign appropriate role
                      if (guild.owner) {
                        const adminRole = await Role.getRoleByName(guild.id, "admin");
                        if (adminRole) {
                          await Role.assignRole(adminRole.id, account.accountId);
                          logger.info(`Assigned admin role to guild owner in guild ${guild.id}`);
                        }
                      } else {
                        const viewerRole = await Role.getRoleByName(guild.id, "viewer");
                        if (viewerRole) {
                          await Role.assignRole(viewerRole.id, account.accountId);
                          logger.info(`Assigned viewer role to admin user in guild ${guild.id}`);
                        }
                      }
                    }
                  } catch (error) {
                    logger.error(`Failed to setup guild ${guild.id}:`, error);
                  }
                }
              } else {
                logger.warn("Failed to fetch user guilds during auth:", guildsResponse.status);
              }
            } catch (error) {
              logger.error("Error caching guilds during auth:", error);
            }
          } catch (error) {
            logger.error("Error linking Discord account:", error);
          }
        }
      }),
    },
  }) as AuthInstance;
  
  return authInstance;
};

export { getSessionFromContext } from "./services/session";

// Export singleton auth instance
export const auth = createAuthInstance();
