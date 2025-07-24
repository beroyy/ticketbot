import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, err, ok } from "@bot/lib/discord-utils";
import { RoleOps } from "@bot/lib/discord-operations";
import { Team, Event } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
import { container } from "@sapphire/framework";

export const RemoveStaffCommand = createCommand({
  name: "removestaff",
  description: "Remove all team roles from a user",
  preconditions: ["guild-only", "admin-only"],

  options: (builder) =>
    builder.addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove from all team roles")
        .setRequired(true)
    ),

  execute: async (interaction) => {
    const targetUser = interaction.options.getUser("user", true);
    const guildId = parseDiscordId(interaction.guild!.id);
    const userId = parseDiscordId(targetUser.id);

    try {
      // Get user's current roles
      const userRoles = await Team.getUserRoles(guildId, userId);

      if (userRoles.length === 0) {
        await InteractionResponse.error(
          interaction,
          `${targetUser.tag} does not have any team roles.`
        );
        return err("No team roles");
      }

      const removedRoles: string[] = [];
      const rolesToSync = userRoles.filter((role) => role.discordRoleId);

      await withTransaction(async () => {
        // Remove all roles within transaction
        for (const role of userRoles) {
          await Team.removeRole(role.id, userId);
          removedRoles.push(role.name);

          // Create event log
          await Event.create({
            guildId,
            actorId: parseDiscordId(interaction.user.id),
            category: "TEAM",
            action: "member_role_removed",
            targetType: "USER",
            targetId: targetUser.id,
            teamRoleId: role.id,
            metadata: { roleName: role.name },
          });
        }

        // Schedule Discord role sync after transaction
        if (rolesToSync.length > 0) {
          afterTransaction(async () => {
            const { failed } = await RoleOps.syncMultipleRolesToDiscord(
              rolesToSync,
              targetUser.id,
              interaction.guild!,
              "remove"
            );

            if (failed.length > 0) {
              container.logger.warn(
                `Failed to remove Discord roles [${failed.join(", ")}] from user ${targetUser.id}`
              );
            }
          });
        }
      });

      const embed = Embed.success(
        "Team Roles Removed",
        `All team roles have been removed from <@${targetUser.id}>.

**Removed roles:** ${removedRoles.join(", ")}`
      );

      await InteractionResponse.reply(interaction, { embeds: [embed] });
      return ok(undefined);
    } catch (error) {
      container.logger.error("Error removing staff:", error);
      await InteractionResponse.error(interaction, "An error occurred while removing team roles.");
      return err("Failed to remove roles");
    }
  },
});
