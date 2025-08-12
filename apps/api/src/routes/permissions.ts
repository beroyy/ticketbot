import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createLogger } from "../lib/utils/logger";
import { getUserRole } from "@ticketsbot/auth";
import { createRoute } from "../factory";
import { compositions } from "../middleware/context";

const logger = createLogger("api:permissions");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RoleResponseSchema = z.object({
  role: z.string().nullable(),
  guildId: z.string(),
  userId: z.string().nullable(),
});

type RoleResponse = z.infer<typeof RoleResponseSchema>;

export const permissionRoutes = createRoute().get(
  "/:guildId",
  ...compositions.authenticated,
  zValidator("param", z.object({ guildId: z.string() })),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const user = c.get("user");

    logger.debug("Fetching user role", {
      guildId,
      userId: user.id,
      discordUserId: user.discordUserId,
    });

    const discordUserId = user.discordUserId;
    if (!discordUserId) {
      return c.json({
        role: null,
        guildId,
        userId: null,
      } satisfies RoleResponse);
    }

    const role = await getUserRole(guildId, discordUserId);

    logger.debug("User role", {
      guildId,
      discordUserId,
      role,
    });

    return c.json({
      role,
      guildId,
      userId: discordUserId,
    } satisfies RoleResponse);
  }
);