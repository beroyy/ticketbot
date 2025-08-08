import { Actor, type WebActor } from "../actor";
import { PermissionFlags } from "../../permissions/constants";

// Type definitions to avoid next dependency
interface NextApiRequest {
  headers: { [key: string]: string | string[] | undefined };
}

interface NextApiResponse<T = any> {
  status: (code: number) => NextApiResponse<T>;
  json: (data: T) => void;
}

interface GetServerSidePropsContext {
  query: { [key: string]: string | string[] | undefined };
  req: NextApiRequest;
}

/**
 * Next.js API route wrapper for providing actor context
 */
export function withApiContext<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse<T>) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    // Get session from auth - this is a placeholder
    const session = await getSession(req);

    if (!session) {
      // No session, execute handler without context
      return handler(req, res);
    }

    // Create Web actor
    const actor: WebActor = {
      type: "web_user",
      properties: {
        userId: session.userId,
        email: session.email,
        discordId: session.discordId,
        selectedGuildId: (req.headers["x-guild-id"] as string) || session.defaultGuildId,
        permissions: await calculateWebUserPermissions(
          session,
          req.headers["x-guild-id"] as string
        ),
        session,
      },
    };

    // Execute handler with context
    return Actor.provideAsync(actor, () => handler(req, res));
  };
}

/**
 * Next.js getServerSideProps wrapper for providing actor context
 */
export function withServerSidePropsContext<
  P extends { [key: string]: any } = { [key: string]: any },
>(
  handler: (
    context: GetServerSidePropsContext
  ) => Promise<{ props: P } | { redirect: any } | { notFound: true }>
) {
  return async (context: GetServerSidePropsContext) => {
    // Get session from auth - this is a placeholder
    const session = await getSessionFromContext(context);

    if (!session) {
      // No session, execute handler without context
      return handler(context);
    }

    // Create Web actor
    const actor: WebActor = {
      type: "web_user",
      properties: {
        userId: session.userId,
        email: session.email,
        discordId: session.discordId,
        selectedGuildId: (context.query.guildId as string) || session.defaultGuildId,
        permissions: await calculateWebUserPermissions(session, context.query.guildId as string),
        session,
      },
    };

    // Execute handler with context
    return Actor.provideAsync(actor, () => handler(context));
  };
}

/**
 * Get session from API request
 * This is a placeholder - integrate with your auth system
 */
async function getSession(req: NextApiRequest): Promise<any> {
  // TODO: Implement actual session retrieval
  // This would typically use your auth package

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  // Placeholder implementation
  return {
    userId: "placeholder-user-id",
    email: "user@example.com",
    discordId: "placeholder-discord-id",
    defaultGuildId: null,
  };
}

/**
 * Get session from SSR context
 * This is a placeholder - integrate with your auth system
 */
async function getSessionFromContext(_context: GetServerSidePropsContext): Promise<any> {
  // TODO: Implement actual session retrieval
  // This would typically use cookies from context.req

  // Placeholder implementation
  return null;
}

/**
 * Calculate effective permissions for a web user
 * This is a placeholder - implement based on your permission system
 */
async function calculateWebUserPermissions(_session: any, _guildId?: string): Promise<bigint> {
  // TODO: Implement actual permission calculation
  // This would typically:
  // 1. Query database for user permissions
  // 2. Apply guild-specific permissions if guildId provided
  // 3. Return calculated permissions

  return PermissionFlags.GUILD_SETTINGS_VIEW | PermissionFlags.TICKET_VIEW_ALL;
}

/**
 * API route handler that requires authentication
 */
export function requireApiAuth(res: NextApiResponse, callback?: () => void): boolean {
  try {
    const actor = Actor.use();
    if (actor.type === "system") {
      // System actors bypass auth
      return true;
    }
    if (callback) callback();
    return true;
  } catch {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
}

/**
 * API route handler that requires specific permissions
 */
export function requireApiPermission(
  res: NextApiResponse,
  permission: bigint,
  callback?: () => void
): boolean {
  try {
    Actor.requirePermission(permission);
    if (callback) callback();
    return true;
  } catch (error) {
    res.status(403).json({
      error: error instanceof Error ? error.message : "Permission denied",
    });
    return false;
  }
}
