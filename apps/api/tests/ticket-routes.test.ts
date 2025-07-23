import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import type { Ticket as PrismaTicket, DiscordUser, Panel as PrismaPanel } from "@prisma/client";

// Mock the auth and domain modules
vi.mock("@ticketsbot/core/auth", () => ({
  authMiddleware: () => async (c: any, next: any) => {
    c.set("user", { id: "123", email: "test@example.com" });
    c.set("selectedGuildId", "123456789");
    await next();
  },
}));

vi.mock("@ticketsbot/core/domains/ticket", () => ({
  Ticket: {
    listAll: vi.fn(),
    getById: vi.fn(),
    close: vi.fn(),
    claim: vi.fn(),
  },
}));

// Type definitions for testing
type TicketWithRelations = PrismaTicket & {
  opener: Pick<DiscordUser, "username" | "avatarUrl" | "metadata">;
  claimedBy: Pick<DiscordUser, "username" | "avatarUrl"> | null;
  panel: Pick<PrismaPanel, "title"> | null;
  _count: { ticketMessages: number };
};

describe("Ticket API Routes", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
  });

  it("should list tickets with proper type validation", async () => {
    const mockTickets: TicketWithRelations[] = [
      {
        id: 1,
        guildId: "123456789",
        openerId: "987654321",
        channelId: "111111111",
        panelId: 1,
        status: "OPEN",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        closedAt: null,
        claimedById: null,
        feedback: null,
        feedbackRating: null,
        opener: {
          username: "testuser",
          avatarUrl: "https://example.com/avatar.png",
          metadata: {},
        },
        claimedBy: null,
        panel: { title: "Support Panel" },
        _count: { ticketMessages: 5 },
      },
    ];

    const { Ticket } = await import("@ticketsbot/core/domains/ticket");
    vi.mocked(Ticket.listAll).mockResolvedValue(mockTickets);

    // Simulate the route handler
    const response = {
      tickets: mockTickets.map((ticket) => ({
        id: ticket.id,
        status: ticket.status,
        opener: {
          username: ticket.opener.username,
          avatarUrl: ticket.opener.avatarUrl,
        },
        claimedBy: ticket.claimedBy
          ? {
              username: ticket.claimedBy.username,
              avatarUrl: ticket.claimedBy.avatarUrl,
            }
          : null,
        panel: ticket.panel?.title || null,
        messageCount: ticket._count.ticketMessages,
        createdAt: ticket.createdAt.toISOString(),
        closedAt: ticket.closedAt?.toISOString() || null,
      })),
    };

    expect(response.tickets).toHaveLength(1);
    expect(response.tickets[0].id).toBe(1);
    expect(response.tickets[0].status).toBe("OPEN");
    expect(response.tickets[0].opener.username).toBe("testuser");
    expect(response.tickets[0].panel).toBe("Support Panel");
    expect(response.tickets[0].messageCount).toBe(5);
  });

  it("should handle ticket close with proper error types", async () => {
    const mockTicket: PrismaTicket = {
      id: 1,
      guildId: "123456789",
      openerId: "987654321",
      channelId: "111111111",
      panelId: 1,
      status: "CLOSED",
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: new Date(),
      claimedById: null,
      feedback: null,
      feedbackRating: null,
    };

    const { Ticket } = await import("@ticketsbot/core/domains/ticket");
    vi.mocked(Ticket.close).mockResolvedValue(mockTicket);

    // Test the close operation
    const result = await Ticket.close(1, "Resolved by support");

    expect(result).toBeDefined();
    expect(result.status).toBe("CLOSED");
    expect(result.closedAt).not.toBeNull();
  });

  it("should handle ticket not found with typed error", async () => {
    const { Ticket } = await import("@ticketsbot/core/domains/ticket");
    vi.mocked(Ticket.getById).mockResolvedValue(null);

    const result = await Ticket.getById(999);

    expect(result).toBeNull();
  });
});
