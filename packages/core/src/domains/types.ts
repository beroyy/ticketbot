/**
 * Type aliases for domain method return types
 * These help avoid Next.js build errors with complex Prisma types
 */

import type {
  Panel as PrismaPanel,
  Form as PrismaForm,
  FormField,
  Ticket as PrismaTicket,
  DiscordUser,
  Guild as PrismaGuild,
  GuildRole as PrismaGuildRole,
  Blacklist,
} from "@prisma/client";

// Panel types
export type PanelWithForm = PrismaPanel & {
  form:
    | (PrismaForm & {
        formFields: FormField[];
      })
    | null;
};
export type Panel = PrismaPanel;

// Ticket types
export type Ticket = PrismaTicket;
export type TicketWithRelations = PrismaTicket & {
  opener: DiscordUser;
  claimedBy: DiscordUser | null;
  panel: PrismaPanel | null;
};
export type TicketListResult = {
  tickets: TicketWithRelations[];
  nextCursor: string | null;
};

// Form types
export type Form = PrismaForm;
export type FormWithFields = PrismaForm & {
  formFields: FormField[];
};

// Guild types
export type GuildSettings = PrismaGuild & {
  teamRoles: PrismaGuildRole[];
  blacklist: Blacklist[];
};
export type GuildRole = PrismaGuildRole;
export type BlacklistEntry = Blacklist;

// Generic result types
export type DomainResult<T> = Promise<T>;
export type VoidResult = Promise<void>;
