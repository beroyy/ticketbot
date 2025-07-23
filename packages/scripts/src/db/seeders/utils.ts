import { faker } from "@faker-js/faker";
import type { TicketStatus } from "@ticketsbot/core";

// Seed faker for reproducibility
faker.seed(123);

/**
 * Utility class for generating realistic Discord snowflake IDs
 * Preserved from original implementation
 */
export class SnowflakeGenerator {
  private counter = 0;
  private readonly baseTimestamp = 1640995200000; // 2022-01-01 timestamp

  generate(): string {
    const timestamp = Date.now() - this.baseTimestamp;
    const workerId = 1;
    const processId = 1;
    this.counter = (this.counter + 1) % 4096;

    // Discord snowflake format: timestamp (42 bits) + worker (5 bits) + process (5 bits) + increment (12 bits)
    const snowflake =
      (BigInt(timestamp) << BigInt(22)) |
      (BigInt(workerId) << BigInt(17)) |
      (BigInt(processId) << BigInt(12)) |
      BigInt(this.counter);

    return snowflake.toString();
  }

  generateBatch(count: number): string[] {
    return Array.from({ length: count }, () => this.generate());
  }
}

/**
 * Progress logger for tracking seed operations
 * Preserved from original implementation
 */
export class ProgressLogger {
  constructor(private enabled: boolean) {}

  log(message: string, progress?: { current: number; total: number }) {
    if (!this.enabled) return;

    const progressStr = progress ? ` (${progress.current}/${progress.total})` : "";
    console.log(`${message}${progressStr}`);
  }

  error(message: string, error?: unknown) {
    console.error(
      `❌ ${message}`,
      error instanceof Error ? error.message : error ? String(error) : ""
    );
  }

  success(message: string) {
    if (this.enabled) {
      console.log(`✅ ${message}`);
    }
  }
}

/**
 * Generate realistic user data using Faker
 */
export function generateUserData(role: "customer" | "support" | "admin"): {
  username: string;
  discriminator: string | null;
  avatarUrl: string;
  metadata: Record<string, unknown>;
} {
  const username = faker.internet
    .username()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .substring(0, 32); // Discord username limit

  const avatarHash = faker.string.alphanumeric(32);

  // Role-specific metadata
  const metadata: Record<string, unknown> = {
    createdAt: faker.date.past({ years: 2 }),
    locale: faker.helpers.arrayElement(["en-US", "en-GB", "de", "fr", "es"]),
  };

  switch (role) {
    case "admin":
      metadata.permissions = "full";
      metadata.team = "management";
      metadata.joinedStaff = faker.date.past({ years: 1 });
      break;
    case "support":
      metadata.team = faker.helpers.arrayElement(["technical", "billing", "general"]);
      metadata.specialization = faker.helpers.arrayElement(["tickets", "payments", "accounts"]);
      metadata.joinedStaff = faker.date.past({ years: 1 });
      break;
    case "customer":
      metadata.subscription = faker.helpers.arrayElement(["free", "premium", "enterprise"]);
      metadata.company = faker.company.name();
      metadata.activity = faker.helpers.arrayElement(["low", "medium", "high"]);
      break;
  }

  return {
    username,
    discriminator: null, // Discord removed discriminators
    avatarUrl: `https://cdn.discordapp.com/avatars/${faker.string.uuid()}/${avatarHash}.png`,
    metadata,
  };
}

/**
 * Generate realistic ticket scenario
 */
export interface TicketScenario {
  subject: string;
  status: TicketStatus;
  priority: "Low" | "Medium" | "High" | "Urgent";
  category: string;
  description: string;
  resolutionNotes?: string;
  openerRole: "customer" | "support" | "admin";
  assigneeRole?: "support" | "admin";
  closedDaysAgo?: number;
}

export function generateTicketScenario(): TicketScenario {
  const categories = ["Technical", "Billing", "Bug Report", "Feature Request", "Sales", "Security"];
  const category = faker.helpers.arrayElement(categories);

  let subject: string;
  let description: string;
  let priority: "Low" | "Medium" | "High" | "Urgent";

  switch (category) {
    case "Technical":
      subject = faker.helpers.arrayElement([
        "API rate limiting issues",
        "Webhook integration not working",
        "Custom domain setup help",
        "Performance degradation",
        "Integration authentication failed",
      ]);
      description = faker.helpers.arrayElement([
        "Getting 429 errors when making API calls, even though I'm within my rate limits.",
        "Webhook endpoint not receiving events despite correct configuration.",
        "Need help setting up custom domain with SSL certificate.",
        "Application response times have increased significantly.",
        "OAuth flow failing with error code 401.",
      ]);
      priority = faker.helpers.arrayElement(["Medium", "High"]);
      break;

    case "Bug Report":
      subject = faker.helpers.arrayElement([
        "Dashboard loading performance",
        "Login system authentication bug",
        "Mobile app crashes",
        "Data export not working",
        "Notification system broken",
      ]);
      description = faker.helpers.arrayElement([
        "Dashboard takes 15+ seconds to load with large datasets.",
        "Users getting logged out randomly after 10-15 minutes.",
        "App crashes on iOS 17+ when opening settings.",
        "CSV export fails for datasets over 1000 rows.",
        "Not receiving email notifications for important events.",
      ]);
      priority = faker.helpers.arrayElement(["Medium", "High", "Urgent"]);
      break;

    case "Billing":
      subject = faker.helpers.arrayElement([
        "Billing discrepancy",
        "Payment processing error",
        "Subscription upgrade",
        "Invoice request",
        "Refund request",
      ]);
      description = faker.helpers.arrayElement([
        "Noticed double billing for premium features on my account.",
        "Credit card payments failing with error code 4001.",
        "Need to upgrade from Basic to Enterprise plan.",
        "Please send invoice for last 3 months of service.",
        "Requesting refund for accidental duplicate payment.",
      ]);
      priority = faker.helpers.arrayElement(["Medium", "High"]);
      break;

    default:
      subject = faker.lorem.sentence({ min: 3, max: 6 });
      description = faker.lorem.paragraph({ min: 2, max: 4 });
      priority = faker.helpers.arrayElement(["Low", "Medium", "High"]);
  }

  const status = faker.helpers.arrayElement(["OPEN", "CLOSED"]) as TicketStatus;

  return {
    subject,
    status,
    priority,
    category,
    description,
    resolutionNotes: status === "CLOSED" ? faker.lorem.sentence() : undefined,
    openerRole: faker.helpers.arrayElement(["customer", "customer", "customer", "support"]), // More customers
    assigneeRole: faker.helpers.maybe(() => faker.helpers.arrayElement(["support", "admin"]), {
      probability: 0.7,
    }),
    closedDaysAgo: status === "CLOSED" ? faker.number.int({ min: 1, max: 30 }) : undefined,
  };
}

/**
 * Generate panel data
 */
export interface PanelData {
  title: string;
  content: string;
  emoji: string;
  buttonText: string;
  color: string;
  type: "SINGLE" | "MULTI";
  category: string;
  options?: Array<{ name: string; description: string; emoji: string }>;
}

export function generatePanelData(): PanelData {
  const panelTypes = [
    {
      title: `${faker.helpers.arrayElement(["🎫", "🎟️", "📋"])} ${faker.company.catchPhrase()}`,
      content: faker.company.buzzPhrase() + ". " + faker.lorem.sentence(),
      emoji: faker.helpers.arrayElement(["🎫", "🎟️", "📋", "💬", "🆘"]),
      buttonText: faker.helpers.arrayElement([
        "Get Support",
        "Open Ticket",
        "Contact Us",
        "Get Help",
      ]),
      color: faker.helpers.arrayElement(["#5865F2", "#57F287", "#ED4245", "#FEE75C", "#5DADE2"]),
      type: "SINGLE" as const,
      category: faker.helpers.arrayElement(["support", "general", "help"]),
    },
    {
      title: `${faker.helpers.arrayElement(["🐛", "🔧", "⚙️"])} ${faker.hacker.phrase()}`,
      content: "Choose the type of technical assistance you need.",
      emoji: faker.helpers.arrayElement(["🐛", "🔧", "⚙️"]),
      buttonText: "Select Issue Type",
      color: "#ED4245",
      type: "MULTI" as const,
      category: "technical",
      options: [
        {
          name: "Bug Report",
          description: "Report a bug or issue",
          emoji: "🐛",
        },
        {
          name: "Feature Request",
          description: "Suggest a new feature",
          emoji: "✨",
        },
        {
          name: "Technical Help",
          description: "Get technical assistance",
          emoji: "🔧",
        },
      ],
    },
  ];

  return faker.helpers.arrayElement(panelTypes);
}

/**
 * Generate support tag data
 */
export interface TagData {
  name: string;
  content: string;
}

export function generateTagData(): TagData {
  const tagTypes = [
    { name: "faq", content: `FAQ: ${faker.lorem.sentence()}` },
    { name: "docs", content: `Documentation: ${faker.internet.url()}` },
    { name: "status", content: `System Status: ${faker.internet.url()}/status` },
    { name: "contact", content: `Contact: ${faker.internet.email()}` },
    { name: faker.word.noun(), content: faker.lorem.sentence() },
  ];

  return faker.helpers.arrayElement(tagTypes);
}

/**
 * Generate blacklist reason
 */
export function generateBlacklistReason(): string {
  return faker.helpers.arrayElement([
    "Spam/Abuse",
    "Terms of Service violation",
    "Harassment",
    "Repeated ticket abuse",
    "Ban evasion",
    "Automated spam bot",
    "Inappropriate content",
    "Multiple account abuse",
  ]);
}
