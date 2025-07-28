import { describe, it, expect, vi, beforeEach } from "vitest";
import { Context } from "hono";
import { ZodError, z } from "zod";
import { VisibleError, PermissionDeniedError } from "@ticketsbot/core/context";
import { errorHandler } from "../src/utils/error-handler";

const mockIsDevelopment = vi.hoisted(() => vi.fn(() => false));

// Mock the env module
vi.mock("../src/env", () => ({
  isDevelopment: mockIsDevelopment,
}));

// Mock the validation module
vi.mock("../src/utils/validation", () => ({
  formatZodError: vi.fn((error) => ({
    error: "Validation failed",
    code: "validation_error",
    details: error.issues.map((issue: any) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    })),
    formatted: "Prettified error message",
  })),
}));

// Mock the Actor context
vi.mock("@ticketsbot/core/context", async () => {
  const actual = await vi.importActual("@ticketsbot/core/context") as any;
  return {
    ...actual,
    Actor: {
      ...actual.Actor,
      maybeUse: vi.fn(() => null),
    },
  };
});

describe("Error Handler", () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      json: vi.fn((body, status) => ({ body, status })),
      status: vi.fn(),
    };
    vi.clearAllMocks();
    // Reset isDevelopment to false by default
    mockIsDevelopment.mockReturnValue(false);
  });

  describe("ZodError handling", () => {
    it("should handle ZodError with 400 status", async () => {
      const schema = z.object({ name: z.string() });
      let zodError: ZodError;

      try {
        schema.parse({ name: 123 });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = await errorHandler(zodError!, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "validation_error",
        }),
        400
      );
    });

    it("should include prettified error in development", async () => {
      mockIsDevelopment.mockReturnValue(true);

      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError;

      try {
        schema.parse({ email: "invalid" });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = await errorHandler(zodError!, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.any(Array),
        }),
        400
      );
    });
  });

  describe("VisibleError handling", () => {
    it("should handle VisibleError with appropriate status codes", async () => {
      const testCases = [
        { code: "not_found", expectedStatus: 404 },
        { code: "validation_error", expectedStatus: 400 },
        { code: "permission_denied", expectedStatus: 403 },
        { code: "rate_limited", expectedStatus: 429 },
        { code: "conflict", expectedStatus: 409 },
        { code: "unknown", expectedStatus: 400 }, // Default
      ];

      for (const { code, expectedStatus } of testCases) {
        const error = new VisibleError(code as any, "Test error message");
        await errorHandler(error, mockContext as Context);

        expect(mockContext.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "Test error message",
            code,
          }),
          expectedStatus
        );
      }
    });

    it("should include details when provided", async () => {
      const error = new VisibleError("validation_error", "Invalid input", {
        field: "email",
        reason: "Must be a valid email",
      });

      await errorHandler(error, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Invalid input",
          code: "validation_error",
          details: {
            field: "email",
            reason: "Must be a valid email",
          },
        }),
        400
      );
    });
  });

  describe("PermissionDeniedError handling", () => {
    it("should handle PermissionDeniedError with 403 status", async () => {
      const error = new PermissionDeniedError("Insufficient permissions");

      await errorHandler(error, mockContext as Context);

      // PermissionDeniedError is treated as a generic Error and message is hidden in production
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "An internal error occurred",
          code: "internal_error",
        }),
        403
      );
    });
  });

  describe("Generic Error handling", () => {
    it("should hide internal errors in production", async () => {
      mockIsDevelopment.mockReturnValue(false);
      
      const error = new Error("Database connection failed");

      await errorHandler(error, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "An internal error occurred",
          code: "internal_error",
        }),
        500
      );
    });

    it("should show error details in development", async () => {
      mockIsDevelopment.mockReturnValue(true);

      const error = new Error("Database connection failed");

      await errorHandler(error, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Database connection failed",
          code: "internal_error",
          details: expect.objectContaining({
            name: "Error",
            stack: expect.any(String),
          }),
        }),
        500
      );
    });
  });

  describe("Unknown error handling", () => {
    it("should handle non-Error objects", async () => {
      const error = { weird: "object" };

      await errorHandler(error as any, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "An unknown error occurred",
          code: "unknown_error",
        }),
        500
      );
    });

    it("should handle string errors", async () => {
      const error = "Something went wrong";

      await errorHandler(error as any, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "An unknown error occurred",
          code: "unknown_error",
        }),
        500
      );
    });
  });
});
