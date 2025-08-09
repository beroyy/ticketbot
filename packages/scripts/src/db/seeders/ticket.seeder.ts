import { faker } from "@faker-js/faker";
import type { SeedConfig, UserWithRole, SeederDependencies } from "./types";
import { ProgressLogger, SnowflakeGenerator, generateTicketScenario } from "./utils";
import { prisma } from "@ticketsbot/db";

export class TicketSeeder {
  private logger: ProgressLogger;
  private snowflake: SnowflakeGenerator;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
    this.snowflake = new SnowflakeGenerator();
  }

  async seed(dependencies: SeederDependencies, count: number): Promise<void> {
    this.logger.log(`Creating ${count} tickets...`);

    const batchSize = this.config.batchSize;
    let created = 0;

    // Process in batches
    for (let batchStart = 0; batchStart < count; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, count);

      await prisma.$transaction(async (tx) => {
        for (let i = batchStart; i < batchEnd; i++) {
          const scenario = generateTicketScenario();

          // Select opener based on scenario
          const opener =
            dependencies.users.find((u) => u.role === scenario.openerRole) || dependencies.users[0];
          if (!opener) continue;

          // Select assignee if needed
          const assignee = scenario.assigneeRole
            ? dependencies.users.find((u) => u.role === scenario.assigneeRole)
            : undefined;

          // Select random panel
          const panelId =
            dependencies.panelIds[Math.floor(Math.random() * dependencies.panelIds.length)];
          if (!panelId) continue;

          // Create ticket
          const ticket = await tx.ticket.create({
            data: {
              guildId: dependencies.guildId,
              number: i + 1,
              panelId,
              openerId: opener.id,
              channelId: this.snowflake.generate(),
              categoryId: this.snowflake.generate(),
              subject: scenario.subject,
              status: "OPEN",
              formData: {
                issue_type: scenario.category,
                priority: scenario.priority,
                description: scenario.description,
                email: faker.internet.email(),
              },
            },
          });

          // Store ticket ID for post-transaction updates
          const ticketId = ticket.id;

          // Claim and close tickets within transaction
          if (assignee) {
            await tx.ticket.update({
              where: { id: ticketId },
              data: {
                claimedById: assignee.id,
              },
            });
          }

          // Close ticket if scenario says so
          if (scenario.status === "CLOSED") {
            await tx.ticket.update({
              where: { id: ticketId },
              data: {
                status: "CLOSED",
                closedById: assignee?.id || opener.id,
                closedAt: new Date(),
              },
            });
          }

          // Add messages within transaction
          await this.addTicketMessages(ticket.id, scenario, opener, assignee, tx);

          created++;
        }
      });

      this.logger.log(`Creating tickets...`, { current: created, total: count });
    }

    this.logger.success(`Created ${created} tickets`);
  }

  private async addTicketMessages(
    ticketId: number,
    scenario: ReturnType<typeof generateTicketScenario>,
    opener: UserWithRole,
    assignee: UserWithRole | undefined,
    tx: any
  ): Promise<void> {
    // Initial message from opener
    await tx.ticketMessage.create({
      data: {
        ticketId,
        messageId: this.snowflake.generate(),
        authorId: opener.id,
        content: scenario.description,
        messageType: "default",
      },
    });

    // Add support responses if claimed
    if (assignee) {
      await tx.ticketMessage.create({
        data: {
          ticketId,
          messageId: this.snowflake.generate(),
          authorId: assignee.id,
          content: `Thanks for contacting support! I'm looking into your ${scenario.category.toLowerCase()} issue.`,
          messageType: "default",
          createdAt: faker.date.soon({ days: 1 }),
        },
      });

      // Add follow-up if needed
      if (scenario.priority === "High" || scenario.priority === "Urgent") {
        await tx.ticketMessage.create({
          data: {
            ticketId,
            messageId: this.snowflake.generate(),
            authorId: assignee.id,
            content:
              "I've escalated this to our senior team due to the high priority. We'll have an update for you shortly.",
            messageType: "default",
            createdAt: faker.date.soon({ days: 1 }),
          },
        });
      }

      // Add resolution message if closed
      if (scenario.status === "CLOSED" && scenario.resolutionNotes) {
        await tx.ticketMessage.create({
          data: {
            ticketId,
            messageId: this.snowflake.generate(),
            authorId: assignee.id,
            content: scenario.resolutionNotes,
            messageType: "default",
            createdAt: faker.date.soon({ days: 2 }),
          },
        });
      }
    }
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing tickets...");

    await prisma.$transaction(async (tx) => {
      // Clear in correct order
      await tx.ticketMessage.deleteMany({});
      await tx.ticketHistory.deleteMany({});
      await tx.ticketFieldResponse.deleteMany({});
      await tx.ticketFeedback.deleteMany({});
      await tx.ticket.deleteMany({});
    });

    this.logger.success("Cleared tickets");
  }
}
