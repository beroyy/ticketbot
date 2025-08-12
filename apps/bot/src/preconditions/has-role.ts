import { createPermissionPrecondition } from "@bot/lib/sapphire";
import type { PreconditionContext } from "@sapphire/framework";
import type { OrganizationRole } from "@ticketsbot/auth";

export interface HasRoleContext extends PreconditionContext {
  roles: OrganizationRole[];
}

export const HasRolePrecondition = createPermissionPrecondition({
  name: "has-role",
  roles: ["admin", "support"], // Default roles
  allowDiscordAdmin: false, // Require explicit roles
});