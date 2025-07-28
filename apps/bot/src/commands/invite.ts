import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, COLORS, InteractionResponse, ok } from "@bot/lib/discord-utils";
import { botConfig } from "@bot/config";

export const InviteCommand = createCommand({
  name: "invite",
  description: "Get the invite link for ticketsbot.ai",

  execute: async (interaction) => {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botConfig.clientId}&permissions=8&scope=bot%20applications.commands`;

    const embed = Embed.builder()
      .setTitle("📨 Invite ticketsbot.ai")
      .setDescription(
        `Click the link below to invite the bot to your server 👇

[**🔗 Invite ticketsbot.ai**](${inviteUrl})

**Getting Started**
After inviting, use \`/setup auto\` to get up-and-running in seconds ⚡`
      )
      .setColor(COLORS.SUCCESS);

    await InteractionResponse.reply(interaction, {
      embeds: [embed],
      ephemeral: true,
    });

    return ok(undefined);
  },
});
