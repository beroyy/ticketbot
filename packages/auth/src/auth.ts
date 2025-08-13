import { logger } from "./utils/logger";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@ticketsbot/db";
import { db } from "@ticketsbot/db";
import { getDiscordAvatarUrl } from "./services/discord-api";
import { getBetterAuthUser, updateDiscordUserId, getDiscordAccount } from "./services/user-linking";
import type { User as AuthUser, Session } from "./types";
import { env } from "./env";

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

type AuthInstance = {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (params: { headers: Headers }) => Promise<unknown>;
    [key: string]: unknown;
  };
  options?: Record<string, unknown>;
  [key: string]: unknown;
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 7,
    cookieCache: {
      enabled: true,
      maxAge: 3600,
    },
  },
  rateLimit: {
    enabled: env.isProd(),
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
  trustedOrigins: [env.WEB_URL, env.API_URL],
  advanced: {
    // cookiePrefix: "ticketsbot",
    useSecureCookies: env.isProd(),
    crossSubDomainCookies: {
      enabled: true,
      domain: env.COOKIE_DOMAIN,
    },
    disableCSRFCheck: env.isDev(),
    cookies: {
      session_token: {
        name: "session_token",
        attributes: {
          sameSite: "lax",
          secure: process.env["NODE_ENV"] === "production",
          httpOnly: true,
          domain: env.COOKIE_DOMAIN,
          // path: "/",
        },
      },
      session_data: {
        name: "session_data",
        attributes: {
          sameSite: "lax",
          secure: process.env["NODE_ENV"] === "production",
          httpOnly: true,
          domain: env.COOKIE_DOMAIN,
          // path: "/",
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
      clientId: env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
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
      username: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      discriminator: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      avatar_url: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },
  plugins: [
    // Note: We're NOT using the organization plugin because:
    // 1. The CLI doesn't respect custom schema mappings
    // 2. It creates duplicate/conflicting fields
    // 3. We'll implement the role-based system using our existing tables
    customSession(async (sessionData: SessionData) => {
      const { user, session } = sessionData;

      const existingUser = user as any;

      if (existingUser.discordUserId) {
        return { session, user };
      }

      const fullUser = await getBetterAuthUser(user.id);

      let discordUser = null;
      if (fullUser?.discordUserId) {
        discordUser = await db.discordUser.getDiscordUser(fullUser.discordUserId);
        if (process.env.NODE_ENV === "development") {
          logger.debug("[Auth] Fetched Discord user", {
            discordUserId: fullUser.discordUserId,
            username: discordUser?.username,
          });
        }
      }

      if (!fullUser) {
        logger.warn("[Auth] No full user found in DB", { userId: user.id });
        return { session, user };
      }

      let discordUserId = fullUser.discordUserId;

      if (!discordUserId) {
        if (process.env.NODE_ENV === "development") {
          logger.debug("[Auth] No Discord ID on user, checking OAuth accounts", {
            userId: user.id,
          });
        }
        const discordAccount = await getDiscordAccount(user.id);
        if (process.env.NODE_ENV === "development") {
          logger.debug("[Auth] Discord OAuth account lookup result", {
            userId: user.id,
            found: !!discordAccount,
            accountId: discordAccount?.accountId,
          });
        }

        if (discordAccount?.accountId) {
          discordUserId = discordAccount.accountId;

          await db.discordUser.ensureDiscordUser(
            discordAccount.accountId,
            `User_${discordAccount.accountId.slice(-6)}`,
            undefined,
            undefined,
            { source: "customSession" }
          );

          await updateDiscordUserId(user.id, discordAccount.accountId);
          logger.info("[Auth] Updated user with Discord ID from OAuth account", {
            userId: user.id,
            discordUserId: discordAccount.accountId,
          });

          discordUser = await db.discordUser.getDiscordUser(discordAccount.accountId);
        }
      }

      const enhancedUser = {
        ...user,
        discordUserId: discordUserId ?? null,
        username: discordUser?.username ?? null,
        discriminator: discordUser?.discriminator ?? null,
        avatar_url: discordUser?.avatarUrl ?? null,
      };

      return {
        session,
        user: enhancedUser,
      };
    }),
    nextCookies(),
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
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
          const account = await getDiscordAccount(user.id);

          logger.debug("Discord account found:", account?.accountId);

          if (!account?.accountId || !account.accessToken) {
            logger.debug("No account or access token found");
            return;
          }

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

            const avatarUrl = getDiscordAvatarUrl(
              discordProfile.id,
              discordProfile.avatar,
              discordProfile.discriminator || "0"
            );

            await db.discordUser.ensureDiscordUser(
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

          await prisma.user.update({
            where: { id: user.id },
            data: {
              discordUserId: account.accountId,
            },
          });

          logger.debug("Linked Discord account to user");

          try {
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

              // const guildModule = await import("../domains/guild/system");
              // const findGuildById = guildModule.getGuildById;
              // const ensureGuild = guildModule.ensureGuild;

              const adminGuilds = guildsWithAdminStatus.filter((g) => g.isAdmin);

              for (const guild of adminGuilds) {
                try {
                  const dbGuild = await db.guild.getGuildById(guild.id);

                  if (dbGuild?.botInstalled) {
                    logger.debug(
                      `Bot is installed in guild ${guild.id}, setting up ownership and roles`
                    );

                    if (guild.owner && dbGuild.ownerDiscordId !== account.accountId) {
                      await db.guild.ensureGuild(guild.id, guild.name, account.accountId);
                      logger.debug(`Updated ownership for guild ${guild.id}`);
                    }

                    await db.role.ensureDefaultRoles(guild.id);

                    if (guild.owner) {
                      const adminRole = await db.role.getRoleByName(guild.id, "admin");
                      if (adminRole) {
                        await db.role.assignRole(adminRole.id, account.accountId);
                        logger.info(`Assigned admin role to guild owner in guild ${guild.id}`);
                      }
                    } else {
                      const viewerRole = await db.role.getRoleByName(guild.id, "viewer");
                      if (viewerRole) {
                        await db.role.assignRole(viewerRole.id, account.accountId);
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

export { getSessionFromContext } from "./services/session";
