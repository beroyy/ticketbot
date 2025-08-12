import {
  createTag,
  deleteTag,
  ensureDiscordUser,
  getDiscordUser,
  getTag,
  listTags,
  updateTag,
} from "./operations";

export const db = {
  discordUser: {
    ensure: ensureDiscordUser,
    get: getDiscordUser,
  },
  tag: {
    create: createTag,
    delete: deleteTag,
    get: getTag,
    list: listTags,
    update: updateTag,
  },
};
