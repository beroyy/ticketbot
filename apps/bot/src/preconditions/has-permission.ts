import { createPermissionPrecondition } from "@bot/lib/sapphire-extensions";
import type { PreconditionContext } from "@sapphire/framework";

export interface HasPermissionContext extends PreconditionContext {
  permission: bigint;
}

export const HasPermissionPrecondition = createPermissionPrecondition({
  name: "has-permission",
  getPermission: (context) => (context as HasPermissionContext).permission,
  allowDiscordAdmin: false, // Require explicit permissions
});
