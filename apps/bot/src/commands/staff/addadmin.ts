import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, err, ok, StaffHelpers } from "@bot/lib/discord-utils";
import { RoleOps } from "@bot/lib/discord-operations";
import { Team, User, Event } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
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
    const guildId = parseDiscordId(interaction.guild!.id);
    const userId = parseDiscordId(targetUser.id);

    try {
      // Ensure default roles exist
      await Team.ensureDefaultRoles(guildId);

      // Check if already admin
      const userRoles = await Team.getUserRoles(guildId, userId);

      if (StaffHelpers.hasRole(userRoles, "admin")) {
        await InteractionResponse.error(
          interaction,
          StaffHelpers.getExistingRoleError(targetUser.tag, "admin")
        );
        return err("User already admin");
      }

      // Get admin role
      const adminRole = await Team.getRoleByName(guildId, "admin");
      if (!adminRole) {
        await InteractionResponse.error(interaction, StaffHelpers.getRoleNotFoundError("admin"));
        return err("Admin role not found");
      }

      await withTransaction(async () => {
        // Ensure user exists
        await User.ensure(
          userId,
          targetUser.username,
          targetUser.discriminator,
          targetUser.displayAvatarURL()
        );

        // Assign role
        await Team.assignRole(adminRole.id, userId, parseDiscordId(interaction.user.id));

        // Create event log
        await Event.create({
          guildId,
          actorId: parseDiscordId(interaction.user.id),
          category: "TEAM",
          action: "member_role_added",
          targetType: "USER",
          targetId: targetUser.id,
          teamRoleId: adminRole.id,
          metadata: { roleName: "admin" },
        });

        // Schedule Discord role sync after transaction
        afterTransaction(async () => {
          const success = await RoleOps.syncTeamRoleToDiscord(
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
        });
      });

      const embed = Embed.success(
        StaffHelpers.formatRoleTitle("admin", "added"),
        `<@${targetUser.id}> has been added as a bot administrator.

**Admin Permissions:**
${RoleOps.formatRolePermissions("admin")}`
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
