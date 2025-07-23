import { Hono } from "hono";
import { validateSession } from "../middleware/permissions";
import type { AuthSession } from "@ticketsbot/core/auth";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession;
};

export const authRoutes: Hono<{ Variables: Variables }> = new Hono<{ Variables: Variables }>();

// GET /auth/me - Get current user info with Discord ID
authRoutes.get("/me", validateSession, (c) => {
  try {
    const user = c.get("user");

    // Discord ID is now directly available from session
    // No need for ensureDiscordLinked as it's handled during auth
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        discordUserId: user.discordUserId,
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return c.json({ error: "Failed to fetch user data" }, 500);
  }
});
