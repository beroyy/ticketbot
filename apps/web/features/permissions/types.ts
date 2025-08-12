import type { OrganizationRole } from "@ticketsbot/auth";

export interface UserRole {
  guildId: string;
  role: OrganizationRole | null;
  userId?: string | null;
}