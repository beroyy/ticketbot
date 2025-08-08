// Export specific schemas
export {
  CreateTagSchema,
  UpdateTagSchema,
  TagQuerySchema,
  TrackTagUsageSchema,
  type CreateTag,
  type UpdateTag,
  type TagQuery,
  type TrackTagUsage,
} from "./schemas";

import { prisma } from "@ticketsbot/db";
import type { Tag as PrismaTag } from "@prisma/client";

export namespace Tag {
  /**
   * Create a new tag for a guild
   */
  export async function create(data: {
    guildId: string;
    name: string;
    content: string;
  }): Promise<PrismaTag> {
    // Check if tag name already exists
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

  /**
   * Update an existing tag
   */
  export async function update(
    tagId: number,
    guildId: string,
    data: {
      name?: string;
      content?: string;
    }
  ): Promise<PrismaTag> {
    // Verify tag exists and belongs to guild
    const tag = await findById(tagId, guildId);
    if (!tag) {
      throw new Error(`Tag with ID ${tagId} not found`);
    }

    // If renaming, check for conflicts
    if (data.name && data.name !== tag.name) {
      const existing = await prisma.tag.findFirst({
        where: {
          guildId: guildId,
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

  /**
   * Delete a tag
   */
  export async function deleteTag(tagId: number, guildId: string): Promise<void> {
    // Verify tag exists and belongs to guild
    const tag = await findById(tagId, guildId);
    if (!tag) {
      throw new Error(`Tag with ID ${tagId} not found`);
    }

    await prisma.tag.delete({
      where: { id: tagId },
    });
  }

  /**
   * Find a tag by ID
   */
  export async function findById(tagId: number, guildId: string): Promise<PrismaTag | null> {
    return await prisma.tag.findFirst({
      where: {
        id: tagId,
        guildId: guildId,
      },
    });
  }

  /**
   * Find a tag by name
   */
  export async function findByName(name: string, guildId: string): Promise<PrismaTag | null> {
    return await prisma.tag.findFirst({
      where: {
        name: name,
        guildId: guildId,
      },
    });
  }

  /**
   * List all tags for a guild
   */
  export async function listForGuild(
    guildId: string,
    options?: {
      orderBy?: "id" | "name" | "createdAt";
      order?: "asc" | "desc";
    }
  ): Promise<PrismaTag[]> {
    const orderBy = options?.orderBy ?? "id";
    const order = options?.order ?? "asc";

    return await prisma.tag.findMany({
      where: { guildId },
      orderBy: { [orderBy]: order },
    });
  }
}
