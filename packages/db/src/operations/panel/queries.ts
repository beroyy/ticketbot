import { prisma } from "../../client";

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

export const getPanelWithForm = async (panelId: number): Promise<any> => {
  return prisma.panel.findUnique({
    where: { id: panelId },
    include: {
      form: {
        include: {
          formFields: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });
};

export const listPanelsByGuildId = async (
  guildId: string,
  orderBy: "title" | "createdAt" | "orderIndex" = "orderIndex",
  order: "asc" | "desc" = "asc"
): Promise<any[]> => {
  return prisma.panel.findMany({
    where: {
      guildId,
      deletedAt: null,
      enabled: true,
    },
    orderBy: { [orderBy]: order },
  });
};