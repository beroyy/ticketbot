import { prisma } from "../../prisma/client";

/**
 * Static panel methods that don't require actor context
 * Used primarily for system operations and middleware
 */

/**
 * Find a panel by ID without permission checks
 * For system operations and middleware
 */
export const findById = async (panelId: number): Promise<any> => {
  return prisma.panel.findUnique({
    where: { id: panelId },
  });
};

/**
 * Get panel with its guild ID
 * Used in middleware to determine guild context
 */
export const getGuildId = async (panelId: number): Promise<string | null> => {
  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    select: { guildId: true },
  });

  return panel?.guildId || null;
};
