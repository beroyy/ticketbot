import "@sapphire/plugin-logger/register";
import "@sapphire/plugin-subcommands/register";
import { createServer } from "http";
import { botConfig, env } from "@bot/config";
import { BaseBotClient, configurePermissionProvider } from "@bot/lib/sapphire-extensions";
import { GatewayIntentBits } from "discord.js";
import { container } from "@sapphire/framework";
import { join as _join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { db } from "@ticketsbot/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TicketsBotClient extends BaseBotClient {
  public override async login(token?: string): Promise<string> {
    container.logger.info("Initializing TicketsBot...");
    return super.login(token);
  }
}

// Simple adapter for Role domain to implement PermissionProvider interface
configurePermissionProvider({
  getUserPermissions: db.role.getUserPermissions,
});

const client = new TicketsBotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  baseUserDirectory: __dirname,
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Graceful shutdown...");
  void client.destroy();
  // eslint-disable-next-line no-process-exit
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Graceful shutdown...");
  void client.destroy();
  // eslint-disable-next-line no-process-exit
  process.exit(0);
});

process.on("unhandledRejection", (error) => {
  client.logger.error("Unhandled promise rejection:", error);
});

// health check for Render
const healthServer = createServer((req, res) => {
  if (req.url === "/health") {
    const isReady = client.isReady();
    res.writeHead(isReady ? 200 : 503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: isReady ? "healthy" : "unhealthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        version: "0.0.1",
      })
    );
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

const PORT = env.BOT_PORT;
healthServer.listen(PORT, () => {
  console.log(`🏥 Health check server listening on port ${PORT.toString()}`);
});

void client.login(botConfig.discordToken);
