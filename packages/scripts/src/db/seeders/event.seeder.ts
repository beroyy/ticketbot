import { Event } from "@ticketsbot/core/domains/event";
import { withTransaction } from "@ticketsbot/core/context";
import { faker } from "@faker-js/faker";
import type { SeedConfig, UserWithRole } from "./types";
import { ProgressLogger } from "./utils";
import type { EventCategory, EventTargetType } from "@prisma/client";

export class EventSeeder {
  private logger: ProgressLogger;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
  }

  async seed(guildId: string, users: UserWithRole[]): Promise<void> {
    // Only seed events for medium and large environments
    if (this.config.environment === "small") {
      return;
    }

    this.logger.log("Creating audit events...");

    const eventTypes = [
      {
        action: "ticket.created",
        category: "TICKET" as EventCategory,
        targetType: "TICKET" as EventTargetType,
      },
      {
        action: "ticket.claimed",
        category: "TICKET" as EventCategory,
        targetType: "TICKET" as EventTargetType,
      },
      {
        action: "ticket.closed",
        category: "TICKET" as EventCategory,
        targetType: "TICKET" as EventTargetType,
      },
      {
        action: "panel.created",
        category: "PANEL" as EventCategory,
        targetType: "PANEL" as EventTargetType,
      },
      {
        action: "panel.deployed",
        category: "PANEL" as EventCategory,
        targetType: "PANEL" as EventTargetType,
      },
      {
        action: "user.blacklisted",
        category: "MEMBER" as EventCategory,
        targetType: "USER" as EventTargetType,
      },
      {
        action: "settings.updated",
        category: "GUILD" as EventCategory,
        targetType: "GUILD" as EventTargetType,
      },
      {
        action: "role.assigned",
        category: "TEAM" as EventCategory,
        targetType: "ROLE" as EventTargetType,
      },
    ];

    const eventCount = this.config.environment === "medium" ? 20 : 50;

    await withTransaction(async () => {
      for (let i = 0; i < eventCount; i++) {
        const eventType = faker.helpers.arrayElement(eventTypes);
        const performer = faker.helpers.arrayElement(users);

        const metadata: Record<string, any> = {};

        // Add event-specific metadata
        switch (eventType.action) {
          case "ticket.created":
            metadata.ticketId = faker.number.int({ min: 1, max: 100 });
            metadata.subject = faker.lorem.sentence();
            break;
          case "ticket.claimed":
            metadata.ticketId = faker.number.int({ min: 1, max: 100 });
            metadata.claimedBy = performer.username;
            break;
          case "ticket.closed":
            metadata.ticketId = faker.number.int({ min: 1, max: 100 });
            metadata.reason = faker.lorem.sentence();
            break;
          case "panel.created":
            metadata.panelId = faker.number.int({ min: 1, max: 10 });
            metadata.title = faker.company.catchPhrase();
            break;
          case "user.blacklisted":
            metadata.targetUserId = faker.helpers.arrayElement(users).id;
            metadata.reason = faker.lorem.sentence();
            break;
          case "settings.updated":
            metadata.setting = faker.helpers.arrayElement([
              "maxTickets",
              "autoClose",
              "feedbackEnabled",
            ]);
            metadata.oldValue = faker.number.int({ min: 1, max: 10 });
            metadata.newValue = faker.number.int({ min: 1, max: 10 });
            break;
          case "role.assigned":
            metadata.roleId = faker.number.int({ min: 1, max: 5 });
            metadata.targetUserId = faker.helpers.arrayElement(users).id;
            break;
        }

        await Event.create({
          guildId,
          actorId: performer.id,
          action: eventType.action,
          category: eventType.category,
          targetType: eventType.targetType,
          targetId: faker.string.uuid(),
          metadata,
        });
      }
    });

    this.logger.success(`Created ${eventCount} audit events`);
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing events...");

    await withTransaction(async () => {
      const { prisma } = await import("@ticketsbot/db");
      await prisma.event.deleteMany({});
    });

    this.logger.success("Cleared events");
  }
}
