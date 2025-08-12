import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, err, ok, StaffHelpers } from "@bot/lib/discord-utils";
import { RoleOps } from "@bot/lib/discord-operations";
import { Role } from "@ticketsbot/core/domains/role";
import { db } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { prisma } from "@ticketsbot/db";
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
      await Role.ensureDefaultRoles(guildId);

      const userRoles = await Role.getUserRoles(guildId, userId);

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

      const supportRole = await Role.getRoleByName(guildId, "support");
      if (!supportRole) {
        await InteractionResponse.error(interaction, StaffHelpers.getRoleNotFoundError("support"));
        return err("Support role not found");
      }

      await prisma.$transaction(async (_tx) => {
        await db.discordUser.ensure(
          userId,
          targetUser.username,
          targetUser.discriminator,
          targetUser.displayAvatarURL()
        );

        await Role.assignRole(supportRole.id, userId, parseDiscordId(interaction.user.id));
      });

      try {
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
      } catch (error) {
        container.logger.error("Failed to sync Discord role", error);
      }

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
