import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, type Result, err, ok, match } from "@bot/lib/discord-utils";
import { Blacklist as GuildBlacklist } from "@ticketsbot/core/domains/guild";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";

// Validation helper for target selection
const validateTarget = (
  targetUser: any,
  targetRole: any
): Result<{ id: string; name: string; isRole: boolean }> => {
  if (!targetUser && !targetRole) {
    return err("Please specify either a user or role to blacklist.");
  }

  if (targetUser && targetRole) {
    return err("Please specify either a user or role, not both.");
  }

  const target = targetUser || targetRole;
  return ok({
    id: target.id,
    name: targetUser?.tag || targetRole?.name || "Unknown",
    isRole: !!targetRole,
  });
};

export const BlacklistCommand = createCommand({
  name: "blacklist",
  description: "Toggle blacklist status for a user or role",
  preconditions: ["guild-only", "admin-only"],

  options: (builder) =>
    builder
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to blacklist/unblacklist")
          .setRequired(false)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role to blacklist/unblacklist")
          .setRequired(false)
      ),

  execute: async (interaction) => {
    const targetUser = interaction.options.getUser("user");
    const targetRole = interaction.options.getRole("role");

    // Validate target selection
    const targetResult = validateTarget(targetUser, targetRole);

    return match(targetResult, {
      ok: async (target) => {
        const guildId = parseDiscordId(interaction.guild!.id);
        const targetId = parseDiscordId(target.id);

        try {
          // Toggle blacklist status - context is already provided by BaseCommand
          const isNowBlacklisted = await GuildBlacklist.toggle(guildId, targetId, target.isRole);

          const targetMention = targetUser ? `<@${target.id}>` : `@${target.name}`;

          const embed = isNowBlacklisted
            ? Embed.error(
                "Added to Blacklist",
                `${targetMention} has been blacklisted and cannot create tickets.`
              )
            : Embed.success(
                "Removed from Blacklist",
                `${targetMention} has been removed from the blacklist and can now create tickets.`
              );

          await InteractionResponse.reply(interaction, { embeds: [embed] });
          return ok(undefined);
        } catch (error) {
          container.logger.error("Error managing blacklist:", error);
          return err("An error occurred while managing the blacklist.");
        }
      },
      err: async (error) => {
        await InteractionResponse.error(interaction, error);
        return err(error);
      },
    });
  },
});
