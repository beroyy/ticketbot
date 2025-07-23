import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
import { faker } from "@faker-js/faker";
import type { SeedConfig, UserWithRole, SeederDependencies } from "./types";
import { ProgressLogger, SnowflakeGenerator, generateTicketScenario } from "./utils";
import { prisma } from "@ticketsbot/core/prisma/client";

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

      await withTransaction(async () => {
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
          const ticket = await prisma.ticket.create({
            data: {
              guildId: dependencies.guildId,
              number: i + 1,
              panelId,
              openerId: opener.id,
              channelId: this.snowflake.generate(),
              categoryId: this.snowflake.generate(),
              subject: scenario.subject,
              status: "OPEN",
            },
          });

          // Create transcript with form data
          const transcript = await prisma.transcript.create({
            data: {
              ticketId: ticket.id,
              formData: {
                issue_type: scenario.category,
                priority: scenario.priority,
                description: scenario.description,
                email: faker.internet.email(),
              },
            },
          });

          // Claim ticket if assignee
          if (assignee) {
            afterTransaction(async () => {
              await prisma.ticketLifecycleEvent.create({
                data: {
                  ticketId: ticket.id,
                  action: "claimed",
                  performedById: assignee.id,
                  claimedById: assignee.id,
                },
              });
            });
          }

          // Close ticket if scenario says so
          if (scenario.status === "CLOSED") {
            afterTransaction(async () => {
              // Update ticket status
              await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                  status: "CLOSED",
                  closedAt: new Date(),
                },
              });
              
              // Create lifecycle event for closure
              await prisma.ticketLifecycleEvent.create({
                data: {
                  ticketId: ticket.id,
                  action: "closed",
                  performedById: assignee?.id || opener.id,
                  closedById: assignee?.id || opener.id,
                  closeReason: "Resolved",
                },
              });
            });
          }

          // Add messages
          await this.addTicketMessages(transcript.id, scenario, opener, assignee);

          created++;
        }
      });

      this.logger.log(`Creating tickets...`, { current: created, total: count });
    }

    this.logger.success(`Created ${created} tickets`);
  }

  private async addTicketMessages(
    transcriptId: number,
    scenario: ReturnType<typeof generateTicketScenario>,
    opener: UserWithRole,
    assignee?: UserWithRole
  ): Promise<void> {
    // Initial message from opener
    await prisma.ticketMessage.create({
      data: {
        transcriptId,
        messageId: this.snowflake.generate(),
        authorId: opener.id,
        content: scenario.description,
        messageType: "default",
      },
    });

    // Add support responses if claimed
    if (assignee) {
      await prisma.ticketMessage.create({
        data: {
          transcriptId,
          messageId: this.snowflake.generate(),
          authorId: assignee.id,
          content: `Thanks for contacting support! I'm looking into your ${scenario.category.toLowerCase()} issue.`,
          messageType: "default",
          createdAt: faker.date.soon({ days: 1 }),
        },
      });

      // Add follow-up if needed
      if (scenario.priority === "High" || scenario.priority === "Urgent") {
        await prisma.ticketMessage.create({
          data: {
            transcriptId,
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
        await prisma.ticketMessage.create({
          data: {
            transcriptId,
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

    await withTransaction(async () => {
      // Clear in correct order
      await prisma.ticketMessage.deleteMany({});
      await prisma.ticketHistory.deleteMany({});
      await prisma.ticketFieldResponse.deleteMany({});
      await prisma.ticketFeedback.deleteMany({});
      await prisma.ticketLifecycleEvent.deleteMany({});
      await prisma.transcript.deleteMany({});
      await prisma.ticket.deleteMany({});
    });

    this.logger.success("Cleared tickets");
  }
}
