import { Precondition } from "@sapphire/framework";
import { hasRole, type OrganizationRole } from "@ticketsbot/auth";
import type { CommandInteraction } from "discord.js";

export class TeamOnlyPrecondition extends Precondition {
  public override async chatInputRun(interaction: CommandInteraction) {
    if (!interaction.guildId) {
      return this.error({ message: "This command can only be used in a server" });
    }

    // Check if user has support, admin, or owner role
    const allowedRoles: OrganizationRole[] = ["owner", "admin", "support"];
    const hasTeamRole = await hasRole(
      interaction.guildId,
      interaction.user.id,
      allowedRoles
    );

    if (!hasTeamRole) {
      return this.error({
        message: "You need to be a team member to use this command",
      });
    }

    return this.ok();
  }
}
