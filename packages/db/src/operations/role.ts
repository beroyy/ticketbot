import { prisma } from "../client";
import { GuildRoleStatus } from "..";

export async function getActiveMembersForRole(guildId: string) {
  return prisma.guildRoleMember.findMany({
    where: {
      guildRole: {
        guildId,
        status: GuildRoleStatus.ACTIVE,
      },
    },
    include: {
      guildRole: true,
      discordUser: true,
    },
    distinct: ["discordId"],
  });
}
