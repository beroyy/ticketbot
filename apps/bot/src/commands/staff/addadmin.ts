import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, err, ok, StaffHelpers } from "@bot/lib/discord-utils";
import { RoleOps } from "@bot/lib/discord-operations";
import { db } from "@ticketsbot/db";
import { parseDiscordId } from "@ticketsbot/core";
import { prisma } from "@ticketsbot/db";
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
      await db.role.ensureDefaultRoles(guildId);

      const userRoles = await db.role.getUserRoles(guildId, userId);

      if (StaffHelpers.hasRole(userRoles, "admin")) {
        await InteractionResponse.error(
          interaction,
          StaffHelpers.getExistingRoleError(targetUser.tag, "admin")
        );
        return err("User already admin");
      }

      const adminRole = await db.role.getRoleByName(guildId, "admin");
      if (!adminRole) {
        await InteractionResponse.error(interaction, StaffHelpers.getRoleNotFoundError("admin"));
        return err("Admin role not found");
      }

      await prisma.$transaction(async (tx) => {
        await db.discordUser.ensure(
          userId,
          targetUser.username,
          targetUser.discriminator,
          targetUser.displayAvatarURL(),
          undefined,
          { tx }
        );

        await db.role.assignRole(adminRole.id, userId, undefined, { tx });
      });

      try {
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
      } catch (error) {
        container.logger.error("Failed to sync Discord role", error);
      }

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
