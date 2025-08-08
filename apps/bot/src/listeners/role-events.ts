import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { Event } from "@ticketsbot/core/domains/event";
import { container } from "@sapphire/framework";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";
import type { Role } from "discord.js";

const ROLE_PREFIX = "Tickets ";

// Role Create
export const RoleCreateListener = ListenerFactory.on("roleCreate", async (role: Role) => {
  if (!role.name.startsWith(ROLE_PREFIX)) return;

  try {
    const actor: DiscordActor = {
      type: "discord_user",
      properties: {
        userId: role.client.user.id,
        username: role.client.user.username,
        guildId: role.guild.id,
        permissions: 0n,
      },
    };

    await Actor.Context.provideAsync(actor, async () => {
      await Event.create({
        guildId: role.guild.id,
        actorId: role.client.user.id,
        category: "TEAM",
        action: "role.created",
        targetType: "ROLE",
        targetId: role.id,
        metadata: {
          roleName: role.name,
          roleColor: role.hexColor,
          permissions: role.permissions.toArray(),
        },
      });
    });
  } catch (error) {
    container.logger.error(`Failed to track role creation:`, error);
  }
});

// Role Delete
export const RoleDeleteListener = ListenerFactory.on("roleDelete", async (role: Role) => {
  if (!role.name.startsWith(ROLE_PREFIX)) return;

  try {
    const actor: DiscordActor = {
      type: "discord_user",
      properties: {
        userId: role.client.user.id,
        username: role.client.user.username,
        guildId: role.guild.id,
        permissions: 0n,
      },
    };

    await Actor.Context.provideAsync(actor, async () => {
      await Event.create({
        guildId: role.guild.id,
        actorId: role.client.user.id,
        category: "TEAM",
        action: "role.deleted",
        targetType: "ROLE",
        targetId: role.id,
        metadata: {
          roleName: role.name,
          hadMembers: role.members.size,
        },
      });
    });
  } catch (error) {
    container.logger.error(`Failed to track role deletion:`, error);
  }
});

// Role Update (permissions, name changes)
export const RoleUpdateListener = ListenerFactory.on(
  "roleUpdate",
  async (oldRole: Role, newRole: Role) => {
    const wasTicketRole = oldRole.name.startsWith(ROLE_PREFIX);
    const isTicketRole = newRole.name.startsWith(ROLE_PREFIX);

    if (!wasTicketRole && !isTicketRole) return;

    try {
      const actor: DiscordActor = {
        type: "discord_user",
        properties: {
          userId: newRole.client.user.id,
          username: newRole.client.user.username,
          guildId: newRole.guild.id,
          permissions: 0n,
        },
      };

      await Actor.Context.provideAsync(actor, async () => {
        if (!wasTicketRole && isTicketRole) {
          // Role entered ticket system
          await Event.create({
            guildId: newRole.guild.id,
            actorId: newRole.client.user.id,
            category: "TEAM",
            action: "role.created",
            targetType: "ROLE",
            targetId: newRole.id,
            metadata: {
              roleName: newRole.name,
              renamedFrom: oldRole.name,
            },
          });
        } else if (wasTicketRole && !isTicketRole) {
          // Role left ticket system
          await Event.create({
            guildId: oldRole.guild.id,
            actorId: oldRole.client.user.id,
            category: "TEAM",
            action: "role.deleted",
            targetType: "ROLE",
            targetId: oldRole.id,
            metadata: {
              roleName: oldRole.name,
              renamedTo: newRole.name,
            },
          });
        } else if (wasTicketRole && isTicketRole) {
          // Track changes
          const changes: Record<string, any> = {};

          if (oldRole.name !== newRole.name) {
            changes.name = { old: oldRole.name, new: newRole.name };
          }
          if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            changes.permissions = {
              added: newRole.permissions.toArray().filter((p) => !oldRole.permissions.has(p)),
              removed: oldRole.permissions.toArray().filter((p) => !newRole.permissions.has(p)),
            };
          }

          if (Object.keys(changes).length > 0) {
            await Event.create({
              guildId: newRole.guild.id,
              actorId: newRole.client.user.id,
              category: "TEAM",
              action: "role.updated",
              targetType: "ROLE",
              targetId: newRole.id,
              metadata: {
                roleName: newRole.name,
                changes,
              },
            });
          }
        }
      });
    } catch (error) {
      container.logger.error(`Failed to track role update:`, error);
    }
  }
);
