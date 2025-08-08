import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = (): PrismaClient => {
  if (process.env.DATABASE_URL?.includes("neon.tech")) {
    const connectionString = process.env.DATABASE_URL!;
    const adapter = new PrismaNeon({ connectionString });

    return new PrismaClient({
      adapter,
      log: ["error", "warn"],
    } as any);
  }

  return new PrismaClient({
    log: ["error", "warn"],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") globalForPrisma.prisma = prisma;
