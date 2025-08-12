import { prisma } from "../client";

export const getPanelById = async (panelId: number): Promise<any> => {
  return prisma.panel.findUnique({
    where: { id: panelId },
  });
};

export const getPanelGuildId = async (panelId: number): Promise<string | null> => {
  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    select: { guildId: true },
  });

  return panel?.guildId || null;
};
