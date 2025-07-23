/**
 * Standard success responses for common scenarios
 */
export const SuccessResponses = {
  ticketCreated: (ticketNumber: number, channelId: string) => ({
    content: `✅ Your ticket #${ticketNumber} has been created in <#${channelId}>.`,
    ephemeral: true,
  }),

  ticketClosed: (reason?: string) => ({
    content: reason
      ? `✅ Ticket closed with reason: ${reason}`
      : "✅ Ticket closed successfully.",
    ephemeral: true,
  }),

  formSubmitted: () => ({
    content: "✅ Your form has been submitted successfully.",
    ephemeral: true,
  }),

  selectionProcessed: () => ({
    content: "✅ Your selection has been processed.",
    ephemeral: true,
  }),

  panelCreated: (panelName: string) => ({
    content: `✅ Panel "${panelName}" has been created successfully.`,
    ephemeral: true,
  }),

  settingsUpdated: () => ({
    content: "✅ Settings have been updated successfully.",
    ephemeral: true,
  }),

  actionCompleted: (action: string) => ({
    content: `✅ ${action} completed successfully.`,
    ephemeral: true,
  }),
} as const;

/**
 * Standard info responses for common scenarios
 */
export const InfoResponses = {
  processing: () => ({
    content: "⏳ Processing your request...",
    ephemeral: true,
  }),

  pleaseWait: () => ({
    content: "⏳ Please wait while I process your request.",
    ephemeral: true,
  }),

  checkingPermissions: () => ({
    content: "🔍 Checking permissions...",
    ephemeral: true,
  }),
} as const;