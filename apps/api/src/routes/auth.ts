import { createRoute } from "../factory";
import { compositions } from "../middleware/factory-middleware";

// Create auth routes using method chaining
export const authRoutes = createRoute()
  // Get current user info with Discord ID
  .get("/me", ...compositions.authenticated, async (c) => {
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
  });
