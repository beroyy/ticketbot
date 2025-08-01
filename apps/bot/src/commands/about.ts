import { createCommand } from "@bot/lib/sapphire-extensions";
import { Embed, InteractionResponse, ok, EPHEMERAL_FLAG } from "@bot/lib/discord-utils";

const aboutEmbed = Embed.info(
  "🎫 About ticketsbot.ai",
  `Build fully-featured support workflows right in your Discord server 💥

**Features:**
• Create and manage support tickets
• Staff permission system
• Customizable ticket panels
• Tags for quick responses
• Auto-closes, blocklists, team stats, and more

**Version:** 0.0.1
**Built with:** Discord.js v14, Prisma & Sapphire Framework`
).setFooter({ text: "ticketsbot.ai - Pro-level Support Workflows" });

export const AboutCommand = createCommand({
  name: "about",
  description: "Display information about ticketsbot.ai",

  execute: async (interaction) => {
    await InteractionResponse.reply(interaction, {
      embeds: [aboutEmbed],
      flags: EPHEMERAL_FLAG,
    });
    return ok(undefined);
  },
});
