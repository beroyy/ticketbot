/**
 * Framework-specific middleware for context propagation
 */

// Discord middleware
export { withDiscordContext, discordCommand } from "./discord";

// Hono middleware
export { actorMiddleware, requireAuth, requirePermission } from "./hono";

// Next.js middleware
export {
  withApiContext,
  withServerSidePropsContext,
  requireApiAuth,
  requireApiPermission,
} from "./nextjs";
