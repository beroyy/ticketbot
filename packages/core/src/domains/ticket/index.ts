// Export core schemas only
export {
  TicketCoreSchema,
  UpdateTicketSchema,
  TicketQuerySchema,
  FindByChannelSchema,
  TicketsConfigSchema,
  type TicketCore,
  type UpdateTicketInput,
  type TicketQuery,
  type FindByChannelInput,
  type TicketsConfigInput,
} from "./schemas";

// Export context-aware Ticket namespace
export { Ticket } from "./index.context";

// Export static methods that don't require context (for preconditions, etc.)
export {
  findByChannelId,
  isTicketChannel,
  getByIdUnchecked,
  getByIds,
  getCountByStatus,
  hasOpenTickets,
  removeParticipantFromAll,
} from "./static";
