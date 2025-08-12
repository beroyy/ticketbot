import { EPHEMERAL_FLAG } from "@bot/lib/utils/constants";

/**
 * Standard success responses for common scenarios
 */
export const SuccessResponses = {
  ticketCreated: (ticketNumber: number, channelId: string) => ({
    content: `✅ Your ticket #${ticketNumber} has been created in <#${channelId}>.`,
    flags: EPHEMERAL_FLAG,
  }),

  ticketClosed: (reason?: string) => ({
    content: reason ? `✅ Ticket closed with reason: ${reason}` : "✅ Ticket closed successfully.",
    flags: EPHEMERAL_FLAG,
  }),

  formSubmitted: () => ({
    content: "✅ Your form has been submitted successfully.",
    flags: EPHEMERAL_FLAG,
  }),

  selectionProcessed: () => ({
    content: "✅ Your selection has been processed.",
    flags: EPHEMERAL_FLAG,
  }),

  panelCreated: (panelName: string) => ({
    content: `✅ Panel "${panelName}" has been created successfully.`,
    flags: EPHEMERAL_FLAG,
  }),

  settingsUpdated: () => ({
    content: "✅ Settings have been updated successfully.",
    flags: EPHEMERAL_FLAG,
  }),

  actionCompleted: (action: string) => ({
    content: `✅ ${action} completed successfully.`,
    flags: EPHEMERAL_FLAG,
  }),
} as const;

/**
 * Standard info responses for common scenarios
 */
export const InfoResponses = {
  processing: () => ({
    content: "⏳ Processing your request...",
    flags: EPHEMERAL_FLAG,
  }),

  pleaseWait: () => ({
    content: "⏳ Please wait while I process your request.",
    flags: EPHEMERAL_FLAG,
  }),

  checkingPermissions: () => ({
    content: "🔍 Checking permissions...",
    flags: EPHEMERAL_FLAG,
  }),
} as const;
