import { Command } from "commander";
import { Actor, type SystemActor } from "@ticketsbot/core/context";
import { prisma } from "@ticketsbot/db";
import { type SeedConfig, DEFAULT_CONFIG, DATA_VOLUMES, type SeederDependencies } from "./types";
import { ProgressLogger } from "./utils";

// Import all seeders
import { UserSeeder } from "./user.seeder";
import { GuildSeeder } from "./guild.seeder";
import { TeamSeeder } from "./team.seeder";
import { FormSeeder } from "./form.seeder";
import { PanelSeeder } from "./panel.seeder";
import { TagSeeder } from "./tag.seeder";
import { TicketSeeder } from "./ticket.seeder";
import { EventSeeder } from "./event.seeder";

export class DatabaseSeederOrchestrator {
  private logger: ProgressLogger;
  private config: SeedConfig;

  constructor(config: Partial<SeedConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new ProgressLogger(this.config.enableProgressLogging);
  }

  async seed(): Promise<void> {
    const volume = DATA_VOLUMES[this.config.environment];

    this.logger.log(`🌱 Starting ${this.config.environment} database seeding...`);

    try {
      // Run everything with system actor context
      const systemActor: SystemActor = {
        type: "system",
        properties: {
          identifier: "database-seeder",
        },
      };

      await Actor.Context.provideAsync(systemActor, async () => {
        // Clear existing data if requested
        if (this.config.clearExistingData) {
          await this.clearAllData();
        }

        // Initialize seeders
        const userSeeder = new UserSeeder(this.config);
        const guildSeeder = new GuildSeeder(this.config);
        const teamSeeder = new TeamSeeder(this.config);
        const formSeeder = new FormSeeder(this.config);
        const panelSeeder = new PanelSeeder(this.config);
        const tagSeeder = new TagSeeder(this.config);
        const ticketSeeder = new TicketSeeder(this.config);
        const eventSeeder = new EventSeeder(this.config);

        // Seed in dependency order
        const users = await userSeeder.seed(volume.users);

        // Select some users for blacklist
        const blacklistUserIds = users
          .filter((u) => u.role === "customer")
          .slice(0, volume.blacklistEntries)
          .map((u) => u.id);

        const guildId = await guildSeeder.seed(blacklistUserIds);
        const teamRoleIds = await teamSeeder.seed(guildId, users);
        const formIds = await formSeeder.seed(guildId);
        const panelIds = await panelSeeder.seed(guildId, formIds, teamRoleIds, volume.panels);

        await tagSeeder.seed(guildId, volume.tags);

        // Create dependencies object for ticket seeder
        const dependencies: SeederDependencies = {
          guildId,
          users,
          panelIds,
          teamRoleIds,
          formIds,
        };

        await ticketSeeder.seed(dependencies, volume.tickets);
        await eventSeeder.seed(guildId, users);

        // Log summary
        this.logSummary({
          guildId,
          userCount: users.length,
          panelCount: panelIds.length,
          ticketCount: volume.tickets,
          tagCount: volume.tags,
          blacklistCount: blacklistUserIds.length,
        });
      });
    } catch (error) {
      this.logger.error("Database seeding failed", error);
      throw error;
    }
  }

  private async clearAllData(): Promise<void> {
    this.logger.log("🧹 Clearing all existing data...");

    const tables = [
      "event",
      "ticketMessage",
      "ticketHistory",
      "ticketFieldResponse",
      "ticketFeedback",
      "ticket",
      "teamRoleMember",
      "panelTeamRole",
      "teamRole",
      "teamMember",
      "panelOption",
      "panel",
      "formField",
      "form",
      "tag",
      "blacklist",
      "guildSupportRole",
      "team",
      "discordUser",
      "guild",
    ];

    for (const table of tables) {
      await (prisma as any)[table].deleteMany({});
    }

    this.logger.success("Cleared all existing data");
  }

  private logSummary(stats: {
    guildId: string;
    userCount: number;
    panelCount: number;
    ticketCount: number;
    tagCount: number;
    blacklistCount: number;
  }): void {
    console.log("");
    console.log("📋 Seeding Summary:");
    console.log(`- Environment: ${this.config.environment}`);
    console.log(`- Guild ID: ${stats.guildId}`);
    console.log(`- Users: ${stats.userCount}`);
    console.log(`- Panels: ${stats.panelCount}`);
    console.log(`- Tickets: ${stats.ticketCount}`);
    console.log(`- Tags: ${stats.tagCount}`);
    console.log(`- Blacklist entries: ${stats.blacklistCount}`);
    console.log("");
    console.log("🎉 Database seeding completed successfully!");
    console.log("🚀 Your application now has production-quality test data with:");
    console.log("- Realistic user personas with Faker-generated data");
    console.log("- Comprehensive ticket scenarios across multiple categories");
    console.log("- Blacklisted users for testing moderation features");
    console.log("- Complete audit trail with events");
  }
}

// CLI entry point
export async function main(): Promise<void> {
  const program = new Command();

  program
    .name("seed")
    .description("Seed the database with test data")
    .option("-e, --environment <type>", "Environment size (small, medium, large)", "medium")
    .option("--no-clear", "Do not clear existing data before seeding")
    .option("--quiet", "Disable progress logging")
    .option("-b, --batch-size <number>", "Batch size for bulk operations", "50")
    .parse();

  const options = program.opts();

  const config: SeedConfig = {
    environment: options.environment as "small" | "medium" | "large",
    clearExistingData: options.clear !== false,
    enableProgressLogging: !options.quiet,
    batchSize: parseInt(options.batchSize, 10) || 50,
  };

  const orchestrator = new DatabaseSeederOrchestrator(config);

  try {
    await orchestrator.seed();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Export for use as a module
export { DatabaseSeederOrchestrator as Seeder };
export * from "./types";
export * from "./utils";
