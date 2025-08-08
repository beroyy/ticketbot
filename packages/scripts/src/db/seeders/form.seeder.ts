import { withTransaction } from "@ticketsbot/core/context";
import type { SeedConfig } from "./types";
import { ProgressLogger } from "./utils";
import { prisma } from "@ticketsbot/db";

export class FormSeeder {
  private logger: ProgressLogger;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
  }

  async seed(guildId: string): Promise<number[]> {
    this.logger.log("Creating forms...");

    const formIds: number[] = [];

    await withTransaction(async () => {
      // Create main support form
      const mainForm = await prisma.form.create({
        data: {
          guildId,
          name: "General Support Request",
        },
      });
      formIds.push(mainForm.id);

      // Add fields to main form
      const mainFields = [
        {
          formId: mainForm.id,
          label: "Issue Type",
          type: "SELECT" as const,
          options: JSON.stringify([
            "Technical Issue",
            "Billing",
            "Feature Request",
            "Bug Report",
            "Other",
          ]),
          required: true,
          placeholder: "Select the type of issue",
          orderIndex: 0,
        },
        {
          formId: mainForm.id,
          label: "Priority Level",
          type: "SELECT" as const,
          options: JSON.stringify(["Low", "Medium", "High", "Urgent"]),
          required: true,
          placeholder: "How urgent is this issue?",
          orderIndex: 1,
        },
        {
          formId: mainForm.id,
          label: "Detailed Description",
          type: "PARAGRAPH" as const,
          placeholder: "Please provide as much detail as possible about your issue...",
          required: true,
          orderIndex: 2,
        },
        {
          formId: mainForm.id,
          label: "Contact Email",
          type: "EMAIL" as const,
          placeholder: "user@example.com",
          required: false,
          orderIndex: 3,
        },
      ];

      await prisma.formField.createMany({
        data: mainFields,
      });

      // Create additional forms based on environment
      if (this.config.environment !== "small") {
        // Bug report form
        const bugForm = await prisma.form.create({
          data: {
            guildId,
            name: "Bug Report Form",
          },
        });
        formIds.push(bugForm.id);

        const bugFields = [
          {
            formId: bugForm.id,
            label: "Bug Type",
            type: "SELECT" as const,
            options: JSON.stringify([
              "UI/Visual",
              "Functionality",
              "Performance",
              "Security",
              "Other",
            ]),
            required: true,
            orderIndex: 0,
          },
          {
            formId: bugForm.id,
            label: "Steps to Reproduce",
            type: "PARAGRAPH" as const,
            placeholder: "1. Go to...\n2. Click on...\n3. See error",
            required: true,
            orderIndex: 1,
          },
          {
            formId: bugForm.id,
            label: "Expected Behavior",
            type: "SHORT_TEXT" as const,
            placeholder: "What should happen?",
            required: true,
            orderIndex: 2,
          },
          {
            formId: bugForm.id,
            label: "Actual Behavior",
            type: "SHORT_TEXT" as const,
            placeholder: "What actually happened?",
            required: true,
            orderIndex: 3,
          },
          {
            formId: bugForm.id,
            label: "Browser/Device",
            type: "SHORT_TEXT" as const,
            placeholder: "e.g., Chrome on Windows 11",
            required: false,
            orderIndex: 4,
          },
        ];

        await prisma.formField.createMany({
          data: bugFields,
        });
      }

      if (this.config.environment === "large") {
        // Feature request form
        const featureForm = await prisma.form.create({
          data: {
            guildId,
            name: "Feature Request Form",
          },
        });
        formIds.push(featureForm.id);

        const featureFields = [
          {
            formId: featureForm.id,
            label: "Feature Title",
            type: "SHORT_TEXT" as const,
            placeholder: "Brief title for your feature idea",
            required: true,
            orderIndex: 0,
          },
          {
            formId: featureForm.id,
            label: "Description",
            type: "PARAGRAPH" as const,
            placeholder: "Describe the feature in detail...",
            required: true,
            orderIndex: 1,
          },
          {
            formId: featureForm.id,
            label: "Use Case",
            type: "PARAGRAPH" as const,
            placeholder: "How would this feature help you?",
            required: true,
            orderIndex: 2,
          },
          {
            formId: featureForm.id,
            label: "Priority",
            type: "SELECT" as const,
            options: JSON.stringify(["Nice to have", "Important", "Critical"]),
            required: true,
            orderIndex: 3,
          },
        ];

        await prisma.formField.createMany({
          data: featureFields,
        });
      }
    });

    this.logger.success(`Created ${formIds.length} forms`);
    return formIds;
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing forms...");

    await withTransaction(async () => {
      const { prisma } = await import("@ticketsbot/db");

      // Clear in correct order
      await prisma.formField.deleteMany({});
      await prisma.form.deleteMany({});
    });

    this.logger.success("Cleared forms");
  }
}
