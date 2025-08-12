// Export the unified bot client
export { bot } from "./bot";
export type { BotClient } from "./bot";

// Re-export individual operations for backward compatibility during migration
// These can be removed once all imports are updated to use the bot client
export { sendToLogChannel, createLogChannelSender } from "./operations/logging";