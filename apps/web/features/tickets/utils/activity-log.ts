// Format action text for display
export const formatAction = (action: string, ticketId: string, performedBy: string): string => {
  switch (action) {
    case "opened":
      return `${performedBy} opened ticket #${ticketId}`;
    case "claimed":
      return `${performedBy} claimed ticket #${ticketId}`;
    case "closed":
      return `${performedBy} closed ticket #${ticketId}`;
    case "close_request_denied":
      return `${performedBy} denied close request for ticket #${ticketId}`;
    case "auto_closed":
      return `Ticket #${ticketId} was automatically closed`;
    case "transferred":
      return `${performedBy} transferred ticket #${ticketId}`;
    default:
      return `${performedBy} performed action: ${action}`;
  }
};