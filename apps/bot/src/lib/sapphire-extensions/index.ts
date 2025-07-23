// Command factory exports
export {
  type CommandConfig,
  createCommand,
  composeCommands,
  type SubcommandConfig,
  type CommandGroupConfig,
  createCommandGroup,
  createSimpleCommand,
  createConfirmCommand,
} from "@bot/lib/sapphire-extensions/command-factory";

// Base command exports
export {
  type PermissionProvider,
  configurePermissionProvider,
  BaseCommand,
} from "@bot/lib/sapphire-extensions/base-command";
export { TicketCommandBase } from "@bot/lib/sapphire-extensions/base-ticket-command";

// Listener factory exports
export {
  type ListenerHandler,
  type ListenerConfig,
  createListener,
  createSapphireListener,
  ListenerFactory,
} from "@bot/lib/sapphire-extensions/listener-factory";

// Base bot client exports
export {
  getDirname,
  type BaseBotClientOptions,
  BaseBotClient,
  createBotClient,
} from "@bot/lib/sapphire-extensions/base-bot-client";

// Interaction handler exports
export {
  type ButtonHandler,
  type ModalHandler,
  type SelectHandler,
  type HandlerConfig,
  createButtonHandler,
  createModalHandler,
  createSelectHandler,
  withIdExtraction,
  createInteractionHandler,
} from "@bot/lib/sapphire-extensions/interaction-factory";

// Precondition factory exports
export {
  type PreconditionConfig,
  type GuildPreconditionConfig,
  type PermissionPreconditionConfig,
  type TicketPreconditionConfig,
  createPrecondition,
  createGuildPrecondition,
  createPermissionPrecondition,
  createTicketPrecondition,
} from "@bot/lib/sapphire-extensions/precondition-factory";
