import { prisma } from "../../client";

export const getDiscordUser = async (discordId: string) => {
  return prisma.discordUser.findUnique({
    where: { id: discordId },
  });
};

export const getAccessibleGuilds = async (discordUserId: string) => {
  const guilds = await prisma.guild.findMany({
    where: {
      OR: [
        { ownerDiscordId: discordUserId },
        { guildMemberPermissions: { some: { discordId: discordUserId } } },
      ],
    },
    select: { id: true },
  });

  return guilds.map((g) => g.id);
};
