import { createCommand } from "@bot/lib/sapphire";
import { Embed, COLORS, InteractionResponse, ok, EPHEMERAL_FLAG } from "@bot/lib/utils";

const COMMAND_CATEGORIES = [
  {
    name: "🎫 Tickets",
    value: `/open - Create a new support ticket
/close - Close the current ticket
/add <user> - Add a user to the ticket
/remove <user> - Remove a user from the ticket
/claim - Claim the ticket as staff
/unclaim - Remove claim from ticket
/transfer <user> - Transfer ticket to another staff member`,
    inline: false,
  },
  {
    name: "👥 Support Staff",
    value: `/addadmin <user_or_role> - Add bot administrator
/addsupport <user_or_role> - Add support staff
/removestaff <user_or_role> - Remove staff member
/blacklist <user> - Toggle blacklist status`,
    inline: false,
  },
  {
    name: "⚙️ Settings",
    value: `/setup auto - Automatic basic setup
/setup limit <number> - Set ticket limit per user
/setup transcripts <channel> - Set transcript channel`,
    inline: false,
  },
  {
    name: "🏷️ Tags",
    value: `/tag <id> - Send a tag response
/managetags add - Create a new tag
/managetags list - List all tags
/managetags delete - Delete a tag`,
    inline: false,
  },
  {
    name: "📊 Statistics",
    value: `/stats user <user> - View user statistics
/stats server - View server statistics`,
    inline: false,
  },
  {
    name: "📖 General",
    value: `/about - About ticketsbot.ai
/help - This help message
/invite - Invite ticketsbot.ai`,
    inline: false,
  },
];

export const HelpCommand = createCommand({
  name: "help",
  description: "Display help information and available commands",

  execute: async (interaction) => {
    const embed = Embed.builder()
      .setTitle("📚 Available Commands")
      .setDescription("Here's everything you can do with ticketsbot.ai 💥")
      .setColor(COLORS.INFO)
      .addFields(COMMAND_CATEGORIES)
      .setFooter({
        text: "If you need help or have any features requests, feel free to reach out!",
      });

    await InteractionResponse.reply(interaction, {
      embeds: [embed],
      flags: EPHEMERAL_FLAG,
    });

    return ok(undefined);
  },
});
