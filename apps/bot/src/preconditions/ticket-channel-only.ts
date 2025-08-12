import { createTicketPrecondition } from "@bot/lib/sapphire";

export const TicketChannelOnlyPrecondition = createTicketPrecondition({
  name: "ticket-channel-only",
  storeTicket: true, // Store ticket in interaction for command to use
  // No custom check needed - just validates ticket presence
});
