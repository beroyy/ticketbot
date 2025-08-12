import { createCommand } from "@bot/lib/sapphire";
import { Embed, InteractionResponse, err, ok, StaffHelpers } from "@bot/lib/utils";
import { bot } from "@bot/lib/bot";
import { db } from "@ticketsbot/db";
import { container } from "@sapphire/framework";

export const AddAdminCommand = createCommand({
  name: "addadmin",
  description: "Add a user to the admin role",
  preconditions: ["guild-only", "admin-only"],

  options: (builder) =>
    builder.addUserOption((option) =>
      option.setName("user").setDescription("The user to add as admin").setRequired(true)
    ),

  execute: async (interaction) => {
    const targetUser = interaction.options.getUser("user", true);
    const guildId = interaction.guild!.id;
    const userId = targetUser.id;

    try {
      // Use high-level role assignment operation
      const result = await db.role.assignUserToRole(guildId, userId, "admin", undefined, {
        username: targetUser.username,
        discriminator: targetUser.discriminator,
        avatarUrl: targetUser.displayAvatarURL(),
      });

      if (result.alreadyHasRole) {
        await InteractionResponse.error(
          interaction,
          StaffHelpers.getExistingRoleError(targetUser.tag, "admin")
        );
        return err("User already admin");
      }

      const adminRole = result.role;

      // Sync Discord role
      try {
        const success = await bot.role.syncTeamRoleToDiscord(
          adminRole,
          targetUser.id,
          interaction.guild!,
          "add"
        );
        if (!success) {
          container.logger.warn(
            `Could not sync Discord role for admin role to user ${targetUser.id}`
          );
        }
      } catch (error) {
        container.logger.error("Failed to sync Discord role", error);
      }

      const embed = Embed.success(
        StaffHelpers.formatRoleTitle("admin", "added"),
        `<@${targetUser.id}> has been added as a bot administrator.

**Admin Permissions:**
${bot.role.formatRolePermissions("admin")}`
      );

      await InteractionResponse.reply(interaction, { embeds: [embed] });
      return ok(undefined);
    } catch (error) {
      container.logger.error("Error adding admin:", error);
      await InteractionResponse.error(
        interaction,
        "An error occurred while adding the administrator."
      );
      return err("Failed to add admin");
    }
  },
});
