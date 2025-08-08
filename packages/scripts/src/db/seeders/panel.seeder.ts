import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
import { faker } from "@faker-js/faker";
import type { SeedConfig } from "./types";
import { ProgressLogger, SnowflakeGenerator, generatePanelData } from "./utils";
import { prisma } from "@ticketsbot/db";

export class PanelSeeder {
  private logger: ProgressLogger;
  private snowflake: SnowflakeGenerator;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
    this.snowflake = new SnowflakeGenerator();
  }

  async seed(
    guildId: string,
    formIds: number[],
    teamRoleIds: number[],
    count: number
  ): Promise<number[]> {
    this.logger.log(`Creating ${count} panels...`);

    const panelIds: number[] = [];

    await withTransaction(async () => {
      // Create static panels first
      const staticPanels = [
        {
          title: "🎫 General Support",
          content:
            "Need help? Our support team is here to assist you 24/7. Click below to open a support ticket.",
          emoji: "🎫",
          buttonText: "Get Support",
          color: "#5865F2",
          type: "SINGLE" as const,
          category: "support",
        },
        {
          title: "🐛 Bug Reports",
          content: "Found a bug? Help us improve by reporting it with detailed reproduction steps.",
          emoji: "🐛",
          buttonText: "Report Bug",
          color: "#ED4245",
          type: "SINGLE" as const,
          category: "bugs",
        },
      ];

      // Create static panels
      for (let i = 0; i < Math.min(staticPanels.length, count); i++) {
        const template = staticPanels[i]!;
        const channelId = this.snowflake.generate();
        const categoryId = this.snowflake.generate();

        const panel = await prisma.panel.create({
          data: {
            guildId,
            type: template.type,
            title: template.title,
            content: template.content,
            channelId,
            categoryId,
            formId: formIds[i] || formIds[0] || null,
            emoji: template.emoji,
            buttonText: template.buttonText,
            color: template.color,
            welcomeMessage: `Thank you for creating a ${template.category} ticket! Our team will respond soon.`,
            introTitle: `${template.title} Created`,
            introDescription: `Your ${template.category} request has been submitted.`,
            channelPrefix: template.category.toLowerCase(),
            hideMentions: false,
            enabled: true,
            mentionRoles:
              i === 0 && teamRoleIds.length > 0 ? JSON.stringify([teamRoleIds[0]]) : null,
            orderIndex: i,
          },
        });

        panelIds.push(panel.id);

        // Deploy first two panels
        if (i < 2) {
          afterTransaction(async () => {
            await prisma.panel.update({
              where: { id: panel.id },
              data: {
                messageId: this.snowflake.generate(),
                deployedAt: new Date(),
              },
            });
          });
        }
      }

      // Create additional dynamic panels using Faker
      const dynamicCount = count - staticPanels.length;
      for (let i = 0; i < dynamicCount; i++) {
        const panelData = generatePanelData();
        const channelId = this.snowflake.generate();
        const categoryId = this.snowflake.generate();

        const panel = await prisma.panel.create({
          data: {
            guildId,
            type: panelData.type,
            title: panelData.title,
            content: panelData.content,
            channelId,
            categoryId,
            formId: formIds[Math.floor(Math.random() * formIds.length)] || null,
            emoji: panelData.emoji,
            buttonText: panelData.buttonText,
            color: panelData.color,
            welcomeMessage: faker.lorem.sentence(),
            introTitle: faker.company.catchPhrase(),
            introDescription: faker.lorem.sentence(),
            channelPrefix: panelData.category,
            hideMentions: faker.datatype.boolean(),
            enabled: true,
            orderIndex: staticPanels.length + i,
          },
        });

        panelIds.push(panel.id);

        // Create panel options for MULTI type panels
        if (panelData.type === "MULTI" && panelData.options) {
          for (let j = 0; j < panelData.options.length; j++) {
            const option = panelData.options[j]!;
            await prisma.panelOption.create({
              data: {
                panelId: panel.id,
                name: option.name,
                description: option.description,
                emoji: option.emoji,
                orderIndex: j,
                categoryId: this.snowflake.generate(),
                enabled: true,
              },
            });
          }
        }
      }
    });

    this.logger.success(`Created ${panelIds.length} panels`);
    return panelIds;
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing panels...");

    await withTransaction(async () => {
      const { prisma } = await import("@ticketsbot/db");

      // Clear in correct order
      await prisma.panelOption.deleteMany({});
      await prisma.panel.deleteMany({});
    });

    this.logger.success("Cleared panels");
  }
}
