import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Role } from "discord.js";

const ROLE_PREFIX = "Tickets ";

// Role Create
export const RoleCreateListener = ListenerFactory.on("roleCreate", async (role: Role) => {
  if (!role.name.startsWith(ROLE_PREFIX)) return;

  // Event logging removed - TCN will handle this automatically
  container.logger.info(`Ticket role created: ${role.name} in ${role.guild.name}`);
});

// Role Delete
export const RoleDeleteListener = ListenerFactory.on("roleDelete", async (role: Role) => {
  if (!role.name.startsWith(ROLE_PREFIX)) return;

  // Event logging removed - TCN will handle this automatically
  container.logger.info(`Ticket role deleted: ${role.name} in ${role.guild.name}`);
});

// Role Update (permissions, name changes)
export const RoleUpdateListener = ListenerFactory.on(
  "roleUpdate",
  async (oldRole: Role, newRole: Role) => {
    const wasTicketRole = oldRole.name.startsWith(ROLE_PREFIX);
    const isTicketRole = newRole.name.startsWith(ROLE_PREFIX);

    if (!wasTicketRole && !isTicketRole) return;

    // Event logging removed - TCN will handle this automatically
    // Database changes to guild_roles will trigger notifications
    
    // Log significant changes for debugging
    if (!wasTicketRole && isTicketRole) {
      container.logger.info(`Role entered ticket system: ${newRole.name}`);
    } else if (wasTicketRole && !isTicketRole) {
      container.logger.info(`Role left ticket system: ${oldRole.name} -> ${newRole.name}`);
    } else if (oldRole.name !== newRole.name) {
      container.logger.info(`Ticket role renamed: ${oldRole.name} -> ${newRole.name}`);
    }
  }
);