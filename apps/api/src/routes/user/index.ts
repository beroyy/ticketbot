import { createLogger } from "@ticketsbot/core";
import { Account } from "@ticketsbot/core/domains/account";
import { createRoute } from "../../factory";
import { compositions } from "../../middleware/context";

const logger = createLogger("api:user");

export const userRoutes = createRoute()
  .get("/", ...compositions.authenticated, async (c) => {
    const user = c.get("user");

    let discordConnected = false;
    let discordAccount = null;

    try {
      if (user.id) {
        const account = await Account.getDiscordAccount(user.id);
        if (account) {
          discordConnected = true;
          const tokenValid =
            !!account.accessToken &&
            (!account.accessTokenExpiresAt || account.accessTokenExpiresAt > new Date());

          discordAccount = {
            accountId: account.accountId,
            hasValidToken: tokenValid,
            expiresAt: account.accessTokenExpiresAt?.toISOString() ?? null,
            needsReauth: !tokenValid,
          };

          logger.debug("Discord account status", {
            accountId: account.accountId,
            hasToken: !!account.accessToken,
            tokenValid,
            expiresAt: account.accessTokenExpiresAt?.toISOString(),
          });
        } else {
          logger.debug("No Discord account linked for user");
        }
      }
    } catch (error) {
      logger.error("Failed to check Discord account status", error);
    }

    return c.json({
      id: user.id,
      email: user.email,
      discordUserId: user.discordUserId ?? null,
      image: user.image ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      discord: {
        connected: discordConnected,
        account: discordAccount,
      },
    });
  });
