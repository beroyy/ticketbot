// Ticket Lifecycle domain namespace
// Export schemas
export {
  CreateTicketSchema,
  ClaimTicketSchema,
  UnclaimTicketSchema,
  CloseTicketSchema,
  ReopenTicketSchema,
  TicketStateTransitionSchema,
  LifecycleEventSchema,
  LifecycleHistoryQuerySchema,
  type CreateTicketInput,
  type ClaimTicketInput,
  type UnclaimTicketInput,
  type CloseTicketInput,
  type ReopenTicketInput,
  type TicketStateTransition,
  type LifecycleEvent,
  type LifecycleHistoryQuery,
} from "./schemas";

// Export namespace
export { TicketLifecycle } from "./operations";
