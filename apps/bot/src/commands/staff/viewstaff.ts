import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, err, ok, StaffHelpers } from "@bot/lib/discord-utils";
import { Role } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";

export const ViewStaffCommand = createCommand({
  name: "viewstaff",
  description: "View all team members and their roles",
  preconditions: ["guild-only", "team-only"],

  execute: async (interaction) => {
    const guildId = parseDiscordId(interaction.guild!.id);

    try {
      // Get all team roles
      const roles = await Role.getRoles(guildId);

      if (roles.length === 0) {
        const embed = Embed.info(
          "Role Members",
          "No team roles have been configured yet.\n\nUse `/addadmin` and `/addsupport` to add team members."
        );
        await InteractionResponse.reply(interaction, { embeds: [embed], ephemeral: true });
        return ok(undefined);
      }

      const embed = Embed.info("Role Members", "Role members and their roles:");

      // Add members by role
      for (const role of roles) {
        const members = await Role.getRoleMembers(role.id);

        if (members.length > 0) {
          const memberList = members.map((member) => `<@${member.discordId}>`).join("\n");
          const roleEmoji = StaffHelpers.getRoleEmoji(role.name);
          const roleName = role.name.charAt(0).toUpperCase() + role.name.slice(1);

          embed.addFields({
            name: `${roleEmoji} ${roleName}${role.isDefault ? " (Default)" : ""}`,
            value: memberList,
            inline: false,
          });
        }
      }

      // Add footer
      embed.setFooter({
        text: "Use /roleinfo <role> to see permissions • /addadmin, /addsupport, /removestaff to manage",
      });

      await InteractionResponse.reply(interaction, { embeds: [embed], ephemeral: true });
      return ok(undefined);
    } catch (error) {
      container.logger.error("Error viewing staff:", error);
      await InteractionResponse.error(
        interaction,
        "An error occurred while retrieving the team member list."
      );
      return err("Failed to view staff");
    }
  },
});
