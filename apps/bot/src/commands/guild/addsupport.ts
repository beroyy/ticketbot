import { createCommand } from "@bot/lib/sapphire";
import { Embed, InteractionResponse, err, ok, StaffHelpers } from "@bot/lib/utils";
import { bot } from "@bot/lib/bot";
import { db } from "@ticketsbot/db";
import { container } from "@sapphire/framework";

export const AddSupportCommand = createCommand({
  name: "addsupport",
  description: "Add a user to the support role",
  preconditions: ["guild-only", "admin-only"],

  options: (builder) =>
    builder.addUserOption((option) =>
      option.setName("user").setDescription("The user to add as support").setRequired(true)
    ),

  execute: async (interaction) => {
    const targetUser = interaction.options.getUser("user", true);
    const guildId = interaction.guild!.id;
    const userId = targetUser.id;

    try {
      // Check if user already has admin role
      const userRoles = await db.role.getUserRoles(guildId, userId);
      if (StaffHelpers.hasRole(userRoles, "admin")) {
        await InteractionResponse.error(
          interaction,
          `${targetUser.tag} is an administrator and already has support permissions.`
        );
        return err("User is admin");
      }

      // Use high-level role assignment operation
      const result = await db.role.assignUserToRole(
        guildId,
        userId,
        "support",
        interaction.user.id,
        {
          username: targetUser.username,
          discriminator: targetUser.discriminator,
          avatarUrl: targetUser.displayAvatarURL(),
        }
      );

      if (result.alreadyHasRole) {
        await InteractionResponse.error(
          interaction,
          StaffHelpers.getExistingRoleError(targetUser.tag, "support")
        );
        return err("User already support");
      }

      const supportRole = result.role;

      // Sync Discord role
      try {
        const success = await bot.role.syncTeamRoleToDiscord(
          supportRole,
          targetUser.id,
          interaction.guild!,
          "add"
        );
        if (!success) {
          container.logger.warn(
            `Could not sync Discord role for support role to user ${targetUser.id}`
          );
        }
      } catch (error) {
        container.logger.error("Failed to sync Discord role", error);
      }

      const embed = Embed.success(
        StaffHelpers.formatRoleTitle("support", "added"),
        `<@${targetUser.id}> has been added as support staff.

**Support Permissions:**
${bot.role.formatRolePermissions("support")}`
      );

      await InteractionResponse.reply(interaction, { embeds: [embed] });
      return ok(undefined);
    } catch (error) {
      container.logger.error("Error adding support staff:", error);
      await InteractionResponse.error(
        interaction,
        "An error occurred while adding the support staff member."
      );
      return err("Failed to add support");
    }
  },
});
