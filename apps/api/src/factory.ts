import { createFactory } from "hono/factory";
import type { AuthSession } from "@ticketsbot/auth";
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
