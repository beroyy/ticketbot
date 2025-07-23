import { describe, it, expect } from "vitest";
import { z } from "zod";
import { PermissionUtils, PermissionFlags } from "../src";
import { parseDiscordId } from "../src";
import type { TicketStatus, PanelType } from "@prisma/client";

describe("Type Safety Tests", () => {
  describe("Discord ID Parsing", () => {
    it("should parse Discord IDs as strings", () => {
      const id = "123456789012345678";
      const parsed = parseDiscordId(id);

      expect(typeof parsed).toBe("string");
      expect(parsed).toBe(id);
    });

    it("should handle bigint Discord IDs", () => {
      const id = BigInt("123456789012345678");
      const parsed = parseDiscordId(id);

      expect(typeof parsed).toBe("string");
      expect(parsed).toBe("123456789012345678");
    });
  });

  describe("Permission BigInt Operations", () => {
    it("should handle permission checks with BigInt", () => {
      const userPerms = BigInt(0x1 | 0x2 | 0x4); // TICKET_VIEW_SELF + TICKET_VIEW_CLAIMED + TICKET_VIEW_ALL
      const requiredPerm = PermissionFlags.TICKET_VIEW_ALL;

      const hasPermission = PermissionUtils.hasPermission(userPerms, requiredPerm);

      expect(hasPermission).toBe(true);
      expect(typeof requiredPerm).toBe("bigint");
    });

    it("should handle permission combination", () => {
      const perm1 = PermissionFlags.TICKET_CLAIM;
      const perm2 = PermissionFlags.TICKET_CLOSE_CLAIMED;

      const combined = PermissionUtils.combine([perm1, perm2]);

      expect(typeof combined).toBe("bigint");
      expect(PermissionUtils.hasPermission(combined, perm1)).toBe(true);
      expect(PermissionUtils.hasPermission(combined, perm2)).toBe(true);
    });
  });

  describe("Enum Type Safety", () => {
    it("should enforce ticket status enum values", () => {
      const validStatuses: TicketStatus[] = ["OPEN", "CLAIMED", "CLOSED"];

      validStatuses.forEach((status) => {
        expect(["OPEN", "CLAIMED", "CLOSED"]).toContain(status);
      });
    });

    it("should enforce panel type enum values", () => {
      const validTypes: PanelType[] = ["BUTTON", "DROPDOWN", "REACTION"];

      validTypes.forEach((type) => {
        expect(["BUTTON", "DROPDOWN", "REACTION"]).toContain(type);
      });
    });
  });

  describe("Zod Schema Type Inference", () => {
    it("should infer types from Zod schemas", () => {
      const UserSchema = z.object({
        id: z.string(),
        username: z.string(),
        email: z.string().email().optional(),
        permissions: z.bigint(),
      });

      type User = z.infer<typeof UserSchema>;

      const user: User = {
        id: "123",
        username: "testuser",
        email: "test@example.com",
        permissions: BigInt(0),
      };

      const result = UserSchema.parse(user);

      expect(result).toEqual(user);
      expect(typeof result.permissions).toBe("bigint");
    });

    it("should validate complex nested types", () => {
      const TicketSchema = z.object({
        id: z.number(),
        status: z.enum(["OPEN", "CLAIMED", "CLOSED"]),
        opener: z.object({
          id: z.string(),
          username: z.string(),
        }),
        panel: z
          .object({
            id: z.number(),
            type: z.enum(["BUTTON", "DROPDOWN", "REACTION"]),
          })
          .nullable(),
      });

      type Ticket = z.infer<typeof TicketSchema>;

      const ticket: Ticket = {
        id: 1,
        status: "OPEN",
        opener: {
          id: "123",
          username: "user123",
        },
        panel: {
          id: 1,
          type: "DROPDOWN",
        },
      };

      expect(() => TicketSchema.parse(ticket)).not.toThrow();
    });
  });

  describe("Error Type Guards", () => {
    it("should properly type guard errors", () => {
      const isErrorWithCode = (error: unknown): error is { code: string; message?: string } => {
        return (
          error !== null &&
          typeof error === "object" &&
          "code" in error &&
          typeof (error as any).code === "string"
        );
      };

      const error1 = { code: "P2002", message: "Unique constraint failed" };
      const error2 = { message: "Generic error" };
      const error3 = "string error";

      expect(isErrorWithCode(error1)).toBe(true);
      expect(isErrorWithCode(error2)).toBe(false);
      expect(isErrorWithCode(error3)).toBe(false);
    });
  });
});
