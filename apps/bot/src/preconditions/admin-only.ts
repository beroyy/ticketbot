import { Precondition } from "@sapphire/framework";
import { hasRole, type OrganizationRole } from "@ticketsbot/auth";
import { PermissionFlagsBits } from "discord.js";
import type { CommandInteraction } from "discord.js";

export class AdminOnlyPrecondition extends Precondition {
  public override async chatInputRun(interaction: CommandInteraction) {
    if (!interaction.guildId) {
      return this.error({ message: "This command can only be used in a server" });
    }

    // Check if user is Discord server admin (for initial setup)
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return this.ok();
    }

    // Check if user has admin or owner role in our system
    const allowedRoles: OrganizationRole[] = ["owner", "admin"];
    const hasAdminRole = await hasRole(
      interaction.guildId,
      interaction.user.id,
      allowedRoles
    );

    if (!hasAdminRole) {
      return this.error({
        message: "You need administrator permissions to use this command",
      });
    }

    return this.ok();
  }
}
