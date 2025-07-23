import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, err, ok, StaffHelpers } from "@bot/lib/discord-utils";
import { RoleOps } from "@bot/lib/discord-operations";
import { Team, User, Event } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
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
    const guildId = parseDiscordId(interaction.guild!.id);
    const userId = parseDiscordId(targetUser.id);

    try {
      // Ensure default roles exist
      await Team.ensureDefaultRoles(guildId);

      // Check existing roles
      const userRoles = await Team.getUserRoles(guildId, userId);
      
      if (StaffHelpers.hasRole(userRoles, "support")) {
        await InteractionResponse.error(
          interaction,
          StaffHelpers.getExistingRoleError(targetUser.tag, "support")
        );
        return err("User already support");
      }

      if (StaffHelpers.hasRole(userRoles, "admin")) {
        await InteractionResponse.error(
          interaction,
          `${targetUser.tag} is an administrator and already has support permissions.`
        );
        return err("User is admin");
      }

      // Get support role
      const supportRole = await Team.getRoleByName(guildId, "support");
      if (!supportRole) {
        await InteractionResponse.error(
          interaction,
          StaffHelpers.getRoleNotFoundError("support")
        );
        return err("Support role not found");
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
        await Team.assignRole(supportRole.id, userId, parseDiscordId(interaction.user.id));

        // Create event log
        await Event.create({
          guildId,
          actorId: parseDiscordId(interaction.user.id),
          category: "TEAM",
          action: "member_role_added",
          targetType: "USER",
          targetId: targetUser.id,
          teamRoleId: supportRole.id,
          metadata: { roleName: "support" },
        });

        // Schedule Discord role sync after transaction
        afterTransaction(async () => {
          const success = await RoleOps.syncTeamRoleToDiscord(
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
        });
      });

      const embed = Embed.success(
        StaffHelpers.formatRoleTitle("support", "added"),
        `<@${targetUser.id}> has been added as support staff.

**Support Permissions:**
${RoleOps.formatRolePermissions("support")}`
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
