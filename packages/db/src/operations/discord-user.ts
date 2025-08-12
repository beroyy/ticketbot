import { prisma } from "../client";
import { type DiscordUser, Prisma } from "../../generated/prisma";

export const ensureDiscordUser = async (
  discordId: string,
  username: string,
  discriminator?: string,
  avatarUrl?: string,
  metadata?: unknown,
  options?: { tx?: any }
): Promise<DiscordUser> => {
  const client = options?.tx || prisma;
  return client.discordUser.upsert({
    where: { id: discordId },
    update: {
      username,
      discriminator: discriminator ?? null,
      avatarUrl: avatarUrl ?? null,
      ...(metadata !== undefined && { metadata: metadata as Prisma.InputJsonValue }),
    },
    create: {
      id: discordId,
      username,
      discriminator: discriminator ?? null,
      avatarUrl: avatarUrl ?? null,
      metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
};

export const getDiscordUser = async (discordId: string) => {
  return prisma.discordUser.findUnique({
    where: { id: discordId },
  });
};
