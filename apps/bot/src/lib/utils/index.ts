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
} from "@bot/lib/utils/result";

export { InteractionResponse, InteractionEdit } from "@bot/lib/utils/responses";

export {
  type EmbedColors,
  DEFAULT_COLORS,
  createEmbedHelpers,
  Embed,
} from "@bot/lib/utils/embed-helpers";

export { COLORS } from "@bot/lib/utils/colors";

export { TicketValidation } from "@bot/lib/utils/validation";

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
} from "@bot/lib/utils/embed-builder";

export { StaffHelpers } from "@bot/lib/utils/staff-helpers";

export { StatsHelpers, STATS_CONSTANTS } from "@bot/lib/utils/stats-helpers";

export {
  isChannelDeletedError,
  canReply,
  createButtonErrorHandler,
  createModalErrorHandler,
  createSelectErrorHandler,
  ErrorResponses,
} from "@bot/lib/utils/error-handlers";

export { SuccessResponses, InfoResponses } from "@bot/lib/utils/success-responses";

export { EPHEMERAL_FLAG } from "@bot/lib/utils/constants";
