import { prisma } from "./client";

import * as analyticsOps from "./operations/analytics";
import * as discordUserOps from "./operations/discord-user";
import * as guildOps from "./operations/guild";
import * as panelOps from "./operations/panel";
import * as roleOps from "./operations/role";
import * as tagOps from "./operations/tag";
import * as ticketOps from "./operations/ticket";
import * as transcriptOps from "./operations/transcript";

export const db = {
  analytics: analyticsOps,
  discordUser: discordUserOps,
  guild: guildOps,
  panel: panelOps,
  role: roleOps,
  tag: tagOps,
  ticket: ticketOps,
  transcript: transcriptOps,

  tx: prisma.$transaction.bind(prisma),

  utils: {
    disconnect: () => prisma.$disconnect(),
    connect: () => prisma.$connect(),
    healthCheck: async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },
  },
};

export type dbClient = typeof db;
