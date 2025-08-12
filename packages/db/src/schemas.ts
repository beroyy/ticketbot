import { z } from "zod";

// Match the Prisma enum for TicketStatus
export const TicketStatusSchema = z.enum(["OPEN", "CLAIMED", "CLOSED", "PENDING"]);

export type TicketStatus = z.infer<typeof TicketStatusSchema>;