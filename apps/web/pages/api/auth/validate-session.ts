import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@ticketsbot/auth";
import { db } from "@ticketsbot/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get session using Better Auth
    const sessionData = await auth.api.getSession({
      headers: new Headers({
        cookie: req.headers.cookie || "",
      }),
    });

    if (!sessionData || typeof sessionData !== "object" || !("user" in sessionData)) {
      return res.status(401).json({ error: "No valid session" });
    }

    const session = sessionData as any;

    // Calculate permissions if guildId is provided
    let permissions = "0";
    const guildId = req.body?.guildId;

    if (guildId && session.user?.discordUserId) {
      try {
        const perms = await db.role.getUserPermissions({ userId: session.user.discordUserId, guildId });
        permissions = perms.toString();
      } catch {
        // Ignore permission errors
      }
    }

    // Return session data with permissions
    res.setHeader("Cache-Control", "private, max-age=60"); // Cache for 1 minute
    res.status(200).json({
      valid: true,
      session: {
        user: session.user,
        session: session.session,
        permissions,
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(401).json({ error: "Invalid session" });
  }
}
