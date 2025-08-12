import { prisma } from "../client";

export async function createTag(data: { guildId: string; name: string; content: string }) {
  const existing = await prisma.tag.findFirst({
    where: {
      guildId: data.guildId,
      name: data.name,
    },
  });

  if (existing) {
    throw new Error(`A tag with the name "${data.name}" already exists`);
  }

  return await prisma.tag.create({
    data: {
      guildId: data.guildId,
      name: data.name,
      content: data.content,
    },
  });
}

export async function deleteTag(tagId: number, guildId: string) {
  const tag = await getTag(tagId, guildId);
  if (!tag) {
    throw new Error(`Tag with ID ${tagId} not found`);
  }

  await prisma.tag.delete({
    where: { id: tagId },
  });
}

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

export async function updateTag(
  tagId: number,
  guildId: string,
  data: {
    name?: string;
    content?: string;
  }
) {
  const tag = await getTag(tagId, guildId);
  if (!tag) {
    throw new Error(`Tag with ID ${tagId} not found`);
  }

  if (data.name && data.name !== tag.name) {
    const existing = await prisma.tag.findFirst({
      where: {
        guildId,
        name: data.name,
        NOT: { id: tagId },
      },
    });

    if (existing) {
      throw new Error(`A tag with the name "${data.name}" already exists`);
    }
  }

  return await prisma.tag.update({
    where: { id: tagId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.content && { content: data.content }),
    },
  });
}
