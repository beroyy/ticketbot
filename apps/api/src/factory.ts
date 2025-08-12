import { createFactory } from "hono/factory";
import type { AuthSession } from "@ticketsbot/core/auth";
import type { Guild, Ticket } from "@ticketsbot/db";

export type AppEnv = {
  Variables: {
    user: AuthSession["user"];
    session: AuthSession;
    guildId?: string;
    guild?: Guild;
    ticket?: Ticket;
    ticketId?: bigint;
    requestId: string;
    startTime: number;
  };
  Bindings: Record<string, never>;
};

export const factory = createFactory<AppEnv>();

export const createRoute = () => factory.createApp();

export type SuccessResponse<T = unknown> = {
  success: true;
  data?: T;
};

export function successResponse<T>(data?: T): SuccessResponse<T> {
  return { success: true, data };
}

export function parseDiscordId(id: string): bigint {
  try {
    const parsed = BigInt(id);
    if (parsed < 0n) {
      throw new Error("Invalid Discord ID");
    }
    return parsed;
  } catch {
    throw new Error("Invalid Discord ID format");
  }
}

export function parseTicketId(id: string): bigint {
  return parseDiscordId(id);
}

export function parseGuildId(id: string): bigint {
  return parseDiscordId(id);
}

export function parseUserId(id: string): bigint {
  return parseDiscordId(id);
}
