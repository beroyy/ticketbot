export const defaultSettings = (guildId: string) => ({
  id: guildId,
  settings: {
    transcriptsChannel: null,
    logChannel: null,
    defaultTicketMessage: null,
    ticketCategories: [],
    supportRoles: [],
    ticketNameFormat: "ticket-{number}",
    allowUserClose: true,
  },
  footer: {
    text: null,
    link: null,
  },
  colors: {
    primary: "#5865F2",
    success: "#57F287",
    error: "#ED4245",
  },
  branding: {
    name: "Support",
    logo: null,
    banner: null,
  },
  tags: [],
  metadata: {
    totalTickets: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});
