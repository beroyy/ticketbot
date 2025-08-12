import { prisma } from "../../client";

export async function getTag(tagId: number, guildId: string) {
  return await prisma.tag.findFirst({
    where: {
      id: tagId,
      guildId,
    },
  });
}

export async function listTags(
  guildId: string,
  options?: {
    orderBy?: "id" | "name" | "createdAt";
    order?: "asc" | "desc";
  }
) {
  const orderBy = options?.orderBy ?? "id";
  const order = options?.order ?? "asc";

  return await prisma.tag.findMany({
    where: { guildId },
    orderBy: { [orderBy]: order },
  });
}