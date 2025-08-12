import { prisma } from "../../client";

export async function ensureGuild(guildId: string, name?: string, ownerId?: string) {
  return prisma.guild.upsert({
    where: { id: guildId },
    update: {
      ...(name && { name }),
      ...(ownerId && { ownerDiscordId: ownerId }),
    },
    create: {
      id: guildId,
      name: name || "Unknown Guild",
      ownerDiscordId: ownerId || null,
    },
  });
}

export async function syncGuildBotInstalledStatus(currentGuildIds: string[]) {
  await prisma.guild.updateMany({
    where: {},
    data: { botInstalled: false },
  });

  if (currentGuildIds.length > 0) {
    await prisma.guild.updateMany({
      where: { id: { in: currentGuildIds } },
      data: { botInstalled: true },
    });
  }
}

export async function toggleGuildBlacklistEntry(
  guildId: string,
  targetId: string,
  isRole: boolean
) {
  const existing = await prisma.blacklist.findFirst({
    where: {
      guildId,
      targetId,
      isRole,
    },
  });

  if (existing) {
    await prisma.blacklist.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.blacklist.create({
      data: {
        guildId,
        targetId,
        isRole,
      },
    });
  }

  return !existing;
}

export async function checkGuildBlacklistEntry(guildId: string, userId: string) {
  const entry = await prisma.blacklist.findFirst({
    where: {
      guildId,
      targetId: userId,
      isRole: false,
    },
  });
  return Boolean(entry);
}