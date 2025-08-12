import { createGuildPrecondition } from "@bot/lib/sapphire";

export const GuildOnlyPrecondition = createGuildPrecondition({
  name: "guild-only",
  // No custom check needed - just validates guild presence
});
