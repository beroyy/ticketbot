export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  unwrap,
  unwrapOr,
  fromPromise,
  tryCatch,
  combine,
  pipe,
  match,
  matchAsync,
  tap,
  tapErr,
  toNullable,
  toOptional,
  fromNullable,
  retry,
} from "@bot/lib/discord-utils/result";

export { InteractionResponse, InteractionEdit } from "@bot/lib/discord-utils/responses";

export { type EmbedColors, DEFAULT_COLORS, createEmbedHelpers, Embed } from "@bot/lib/discord-utils/embed-helpers";

export { COLORS } from "@bot/lib/discord-utils/colors";

export { TicketValidation } from "@bot/lib/discord-utils/validation";

export {
  type EmbedOptions,
  type EmbedModifier,
  createEmbed,
  pipe as pipeEmbed,
  pipeEmbed as embedPipe,
  when as whenEmbed,
  withTitle,
  withDescription,
  withField,
  withTimestamp,
  withFooter,
  withThumbnail,
  withPrimaryColor,
  withSuccessColor,
  withWarningColor,
  withErrorColor,
  withInfoColor,
} from "@bot/lib/discord-utils/embed-builder";

export {
  type EventSchemas,
  type EventName,
  type EventData,
  createDomainEventEmitter,
} from "@bot/lib/discord-utils/domain-events";

export { StaffHelpers } from "@bot/lib/discord-utils/staff-helpers";

export { StatsHelpers, STATS_CONSTANTS } from "@bot/lib/discord-utils/stats-helpers";

export {
  isChannelDeletedError,
  canReply,
  createButtonErrorHandler,
  createModalErrorHandler,
  createSelectErrorHandler,
  ErrorResponses,
} from "@bot/lib/discord-utils/error-handlers";

export { SuccessResponses, InfoResponses } from "@bot/lib/discord-utils/success-responses";
