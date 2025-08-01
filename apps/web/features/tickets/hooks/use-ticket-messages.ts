import { useQuery } from "@tanstack/react-query";
import { ticketQueries } from "../queries/ticket-queries";

export function useTicketMessages(
  ticketId: string,
  guildId: string | null,
  refetchInterval?: number | false
) {
  return useQuery(ticketQueries.messages(ticketId, guildId, refetchInterval));
}
