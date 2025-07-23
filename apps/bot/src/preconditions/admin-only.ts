import { createPermissionPrecondition } from "@bot/lib/sapphire-extensions";
import { PermissionFlags } from "@ticketsbot/core";

export const AdminOnlyPrecondition = createPermissionPrecondition({
  name: "admin-only",
  permission: PermissionFlags.GUILD_SETTINGS_EDIT,
  allowGuildOwner: true,
  allowDiscordAdmin: true, // Allows Discord admins to run setup commands before team roles exist
});
