import { useQuery } from "@tanstack/react-query";
import { ticketQueries } from "../queries/ticket-queries";

export function useTicketStats(guildId: string | null) {
  return useQuery(ticketQueries.stats(guildId));
}
