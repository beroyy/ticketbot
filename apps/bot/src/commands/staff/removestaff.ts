import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, err, ok } from "@bot/lib/discord-utils";
import { RoleOps } from "@bot/lib/discord-operations";
import { parseDiscordId } from "@ticketsbot/core";
import { db } from "@ticketsbot/db";
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
      const userRoles = await db.role.getUserRoles(guildId, userId);

      if (userRoles.length === 0) {
        await InteractionResponse.error(
          interaction,
          `${targetUser.tag} does not have any team roles.`
        );
        return err("No team roles");
      }

      const removedRoles: string[] = [];
      const rolesToSync = userRoles.filter((role: any) => role.discordRoleId);

      // Remove each role
      for (const role of userRoles) {
        const result = await db.role.removeUserFromRole(guildId, userId, role.name);
        if (result.wasRemoved) {
          removedRoles.push(role.name);
        }
      }

      if (rolesToSync.length > 0) {
        try {
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
        } catch (error) {
          container.logger.error("Failed to sync Discord roles", error);
        }
      }

      const embed = Embed.success(
        "Role Roles Removed",
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
