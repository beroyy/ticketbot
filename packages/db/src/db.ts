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
  tag: {
    create: createTag,
    delete: deleteTag,
    get: getTag,
    list: listTags,
    update: updateTag,
  },
};
