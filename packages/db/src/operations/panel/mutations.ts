import { prisma } from "../../client";

export const createPanel = async (data: any): Promise<any> => {
  return prisma.panel.create({
    data,
  });
};

export const updatePanel = async (panelId: number, data: any): Promise<any> => {
  return prisma.panel.update({
    where: { id: panelId },
    data,
  });
};

export const deletePanel = async (panelId: number): Promise<any> => {
  return prisma.panel.update({
    where: { id: panelId },
    data: { deletedAt: new Date() },
  });
};

export const deployPanel = async (panelId: number): Promise<any> => {
  const panel = await prisma.panel.update({
    where: { id: panelId },
    data: { deployedAt: new Date() },
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
  return panel;
};