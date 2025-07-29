import { withTransaction } from "@ticketsbot/core/context";
import { faker } from "@faker-js/faker";
import type { SeedConfig } from "./types";
import { ProgressLogger, SnowflakeGenerator } from "./utils";
import { prisma } from "@ticketsbot/core/prisma/client";

export class GuildSeeder {
  private logger: ProgressLogger;
  private snowflake: SnowflakeGenerator;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
    this.snowflake = new SnowflakeGenerator();
  }

  async seed(blacklistUserIds?: string[]): Promise<string> {
    this.logger.log("Creating guild...");

    // Use DEV_GUILD_ID from environment or generate one
    const guildId = process.env.DEV_GUILD_ID || this.snowflake.generate();

    await withTransaction(async () => {
      // Create or update guild with comprehensive settings
      await prisma.guild.upsert({
        where: { id: guildId },
        update: {
          name: faker.company.name() + " Community",
        },
        create: {
          id: guildId,
          name: faker.company.name() + " Community",
          defaultCategoryId: this.snowflake.generate(),
          supportCategoryId: this.snowflake.generate(),
          transcriptsChannel: this.snowflake.generate(),
          maxTicketsPerUser: faker.number.int({ min: 1, max: 5 }),
          autoCloseHours: faker.number.int({ min: 24, max: 168 }), // 1-7 days
          showClaimButton: true,
          feedbackEnabled: faker.datatype.boolean(),
          colorScheme: {
            primary: faker.helpers.arrayElement(["#5865F2", "#57F287", "#ED4245", "#FEE75C"]),
            success: "#57F287",
            error: "#ED4245",
            warning: "#FEE75C",
          },
          branding: {
            name: faker.company.catchPhrase(),
            logo: faker.image.url(),
            banner: faker.helpers.maybe(() => faker.image.url(), { probability: 0.3 }),
          },
          footerText: faker.company.buzzPhrase(),
          footerLink: faker.internet.url(),
          ticketNameFormat: faker.helpers.arrayElement([
            "ticket-{number}",
            "support-{number}",
            "{number}",
          ]),
          allowUserClose: faker.datatype.boolean(),
          logChannel: this.snowflake.generate(),
          defaultTicketMessage: faker.lorem.sentence(),
          totalTickets: 0,
        },
      });

      // Create support roles
      const supportRoleCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < supportRoleCount; i++) {
        const roleId = this.snowflake.generate();
        await prisma.guildSupportRole.create({
          data: {
            guildId,
            roleId,
          },
        });
      }

      // Add blacklist entries if user IDs provided
      if (blacklistUserIds && blacklistUserIds.length > 0) {
        const blacklistCount = Math.min(
          blacklistUserIds.length,
          this.config.environment === "small" ? 2 : this.config.environment === "medium" ? 5 : 10
        );

        for (let i = 0; i < blacklistCount; i++) {
          const userId = blacklistUserIds[i];
          if (userId) {
            await prisma.blacklist.create({
              data: {
                guildId,
                targetId: userId,
                isRole: false,
              },
            });
          }
        }

        this.logger.log(`Added ${blacklistCount} blacklist entries`);
      }
    });

    this.logger.success(`Created guild: ${guildId}`);
    return guildId;
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing existing guilds...");

    await withTransaction(async () => {
      const { prisma } = await import("@ticketsbot/core/prisma/client");

      // Clear in correct order to respect foreign keys
      await prisma.blacklist.deleteMany({});
      await prisma.guildSupportRole.deleteMany({});
      await prisma.guild.deleteMany({});
    });

    this.logger.success("Cleared existing guilds");
  }
}
