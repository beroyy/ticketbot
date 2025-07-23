import { Tag } from "@ticketsbot/core/domains/tag";
import { withTransaction } from "@ticketsbot/core/context";
import type { SeedConfig } from "./types";
import { ProgressLogger, generateTagData } from "./utils";

export class TagSeeder {
  private logger: ProgressLogger;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
  }

  async seed(guildId: string, count: number): Promise<void> {
    this.logger.log(`Creating ${count} tags...`);

    await withTransaction(async () => {
      // Create static tags first
      const staticTags = [
        { name: "status", content: "Check system status: https://status.example.com" },
        {
          name: "billing",
          content: "For billing inquiries, include your account email and invoice number.",
        },
        { name: "api", content: "API documentation: https://docs.example.com/api" },
        { name: "pricing", content: "View pricing plans: https://example.com/pricing" },
        { name: "docs", content: "Documentation: https://docs.example.com" },
      ];

      // Create static tags
      for (let i = 0; i < Math.min(staticTags.length, count); i++) {
        const tag = staticTags[i]!;
        await Tag.create({
          guildId,
          name: tag.name,
          content: tag.content,
        });
      }

      // Create additional dynamic tags
      const dynamicCount = count - staticTags.length;
      for (let i = 0; i < dynamicCount; i++) {
        const tagData = generateTagData();

        // Ensure unique tag names
        const existingTag = await Tag.findByName(guildId, tagData.name);
        if (!existingTag) {
          await Tag.create({
            guildId,
            name: tagData.name,
            content: tagData.content,
          });
        }
      }
    });

    this.logger.success(`Created ${count} tags`);
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing tags...");

    await withTransaction(async () => {
      const { prisma } = await import("@ticketsbot/core/prisma/client");
      await prisma.tag.deleteMany({});
    });

    this.logger.success("Cleared tags");
  }
}
