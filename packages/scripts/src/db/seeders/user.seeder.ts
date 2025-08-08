import { User } from "@ticketsbot/core/domains/user";
import { withTransaction } from "@ticketsbot/core/context";
import type { SeedConfig, UserWithRole } from "./types";
import { ProgressLogger, SnowflakeGenerator, generateUserData } from "./utils";

export class UserSeeder {
  private logger: ProgressLogger;
  private snowflake: SnowflakeGenerator;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
    this.snowflake = new SnowflakeGenerator();
  }

  async seed(count: number): Promise<UserWithRole[]> {
    this.logger.log(`Creating ${count} users...`);

    const users: UserWithRole[] = [];

    // Distribution of roles
    const roleDistribution = {
      customer: Math.ceil(count * 0.6),
      support: Math.ceil(count * 0.3),
      admin: Math.ceil(count * 0.1),
    };

    // Ensure we don't exceed total count
    const total = roleDistribution.customer + roleDistribution.support + roleDistribution.admin;
    if (total > count) {
      roleDistribution.customer -= total - count;
    }

    await withTransaction(async () => {
      let created = 0;

      // Create customers
      for (let i = 0; i < roleDistribution.customer; i++) {
        const id = this.snowflake.generate();
        const userData = generateUserData("customer");

        await User.ensure(
          id,
          userData.username,
          userData.discriminator || undefined,
          userData.avatarUrl
        );

        users.push({
          id,
          username: userData.username,
          role: "customer",
        });

        created++;
        if (created % 10 === 0) {
          this.logger.log(`Creating users...`, { current: created, total: count });
        }
      }

      // Create support staff
      for (let i = 0; i < roleDistribution.support; i++) {
        const id = this.snowflake.generate();
        const userData = generateUserData("support");

        await User.ensure(
          id,
          userData.username,
          userData.discriminator || undefined,
          userData.avatarUrl
        );

        users.push({
          id,
          username: userData.username,
          role: "support",
        });

        created++;
      }

      // Create admins
      for (let i = 0; i < roleDistribution.admin; i++) {
        const id = this.snowflake.generate();
        const userData = generateUserData("admin");

        await User.ensure(
          id,
          userData.username,
          userData.discriminator || undefined,
          userData.avatarUrl
        );

        users.push({
          id,
          username: userData.username,
          role: "admin",
        });

        created++;
      }
    });

    this.logger.success(
      `Created ${users.length} users (${roleDistribution.customer} customers, ${roleDistribution.support} support, ${roleDistribution.admin} admins)`
    );

    return users;
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing existing users...");

    await withTransaction(async () => {
      // Clear users through raw Prisma since we don't have a delete method in User domain
      const { prisma } = await import("@ticketsbot/db");
      await prisma.discordUser.deleteMany({});
    });

    this.logger.success("Cleared existing users");
  }
}
