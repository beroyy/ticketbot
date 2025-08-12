export function createTicketChannelName(
  ticketId: number,
  username: string,
  panelChannelPrefix?: string,
  ticketNameFormat?: string
): string {
  if (panelChannelPrefix) {
    return `${panelChannelPrefix}-${username.toLowerCase()}`;
  }

  if (ticketNameFormat === "ticket-{username}") {
    return `ticket-${username.toLowerCase()}`;
  }

  return `ticket-${ticketId.toString()}`;
}
