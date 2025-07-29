import { createPermissionPrecondition } from "@bot/lib/sapphire-extensions";
import { PermissionFlags } from "@ticketsbot/core";

export const TeamOnlyPrecondition = createPermissionPrecondition({
  name: "team-only",
  permission: PermissionFlags.TICKET_VIEW_ALL,
  allowDiscordAdmin: false, // Role members must have explicit permissions
});
