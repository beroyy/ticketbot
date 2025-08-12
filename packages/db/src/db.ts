import {
  createTag,
  deleteTag,
  ensureDiscordUser,
  getDiscordUser,
  ensureGuild,
  getGuildById,
  getTag,
  listTags,
  updateGuild,
  updateTag,
  ensureGuildWithDefaults,
  getGuildSettings,
  syncGuildBotInstalledStatus,
  checkGuildBlacklistEntry,
  toggleGuildBlacklistEntry,
} from "./operations";
import { getPanelById, getPanelGuildId } from "./operations/panel";

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
    syncBotInstalledStatus: syncGuildBotInstalledStatus,
    getSettings: getGuildSettings,
    toggleBlacklistEntry: toggleGuildBlacklistEntry,
    checkBlacklistEntry: checkGuildBlacklistEntry,
  },
  panel: {
    get: getPanelById,
    getGuildId: getPanelGuildId,
  },
  tag: {
    create: createTag,
    delete: deleteTag,
    get: getTag,
    list: listTags,
    update: updateTag,
  },
};
