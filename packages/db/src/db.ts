import {
  createTag,
  deleteTag,
  ensureDiscordUser,
  getDiscordUser,
  getTag,
  listTags,
  updateTag,
  hasOpenTickets,
  getCountByStatus,
  removeParticipantFromAll,
  getPanelById,
  getPanelGuildId,
  getTicketByChannelId,
  isTicketChannel,
  getByIdUnchecked,
  getByIds,
} from "./operations";
import {
  getGuildById,
  updateGuild,
  getGuildSettings,
  getTeamRoles,
} from "./operations/guild/queries";
import {
  ensureGuild,
  ensureGuildWithDefaults,
  syncGuildBotInstalledStatus,
  checkGuildBlacklistEntry,
  toggleGuildBlacklistEntry,
  updateGuildSettings,
} from "./operations/guild/mutations";

import { getActiveMembersForRole } from "./operations/role";

export const db = {
  discordUser: {
    ensure: ensureDiscordUser,
    get: getDiscordUser,
  },
  guild: {
    ensure: ensureGuild,
    ensureWithDefaults: ensureGuildWithDefaults,
    get: getGuildById,
    update: updateGuild,
    updateSettings: updateGuildSettings,
    syncBotInstalledStatus: syncGuildBotInstalledStatus,
    getSettings: getGuildSettings,
    toggleBlacklistEntry: toggleGuildBlacklistEntry,
    checkBlacklistEntry: checkGuildBlacklistEntry,
    getTeamRoles: getTeamRoles,
  },
  panel: {
    get: getPanelById,
    getGuildId: getPanelGuildId,
  },
  role: {
    getActiveMembers: getActiveMembersForRole,
  },
  tag: {
    create: createTag,
    delete: deleteTag,
    get: getTag,
    list: listTags,
    update: updateTag,
  },
  ticket: {
    get: getTicketByChannelId,
    getByIdUnchecked: getByIdUnchecked,
    getByIds: getByIds,
    getCountByStatus: getCountByStatus,
    hasOpenTickets: hasOpenTickets,
    removeParticipantFromAll: removeParticipantFromAll,
    isTicketChannel: isTicketChannel,
  },
};
