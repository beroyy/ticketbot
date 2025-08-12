// Query operations
export {
  getByChannelId,
  isTicketChannel,
  getByIdUnchecked,
  getById,
  getByIds,
  getCountByStatus,
  hasOpenTickets,
  getUserOpenCount,
  list,
  getCurrentClaim,
  getLifecycleHistory,
} from "./queries";

// Mutation operations
export {
  addParticipant,
  removeParticipant,
  removeParticipantFromAll,
  updateChannelId,
  update,
} from "./mutations";

// Transaction operations (complex state transitions)
export {
  create,
  close,
  claim,
  unclaim,
  requestClose,
  cancelCloseRequest,
  updateAutoClose,
} from "./transactions";

// Backward compatibility aliases
export { getByChannelId as getTicketByChannelId } from "./queries";