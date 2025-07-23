import { describe, it, expect, vi, beforeEach } from "vitest";
import { Context } from "hono";
import { ZodError, z } from "zod";
import { VisibleError, PermissionDeniedError } from "@ticketsbot/core/context";
import { errorHandler } from "../src/utils/error-handler";

// Mock the env module
vi.mock("../src/env", () => ({
  isDevelopment: vi.fn(() => false),
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

describe("Error Handler", () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      json: vi.fn((body, status) => ({ body, status })),
      status: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("ZodError handling", () => {
    it("should handle ZodError with 400 status", () => {
      const schema = z.object({ name: z.string() });
      let zodError: ZodError;

      try {
        schema.parse({ name: 123 });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = errorHandler(zodError!, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "validation_error",
        }),
        400
      );
    });

    it("should include prettified error in development", async () => {
      const { isDevelopment } = await import("../src/env");
      (isDevelopment as any).mockReturnValue(true);

      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError;

      try {
        schema.parse({ email: "invalid" });
      } catch (error) {
        zodError = error as ZodError;
      }

      const result = errorHandler(zodError!, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.any(Array),
        }),
        400
      );
    });
  });

  describe("VisibleError handling", () => {
    it("should handle VisibleError with appropriate status codes", () => {
      const testCases = [
        { code: "not_found", expectedStatus: 404 },
        { code: "validation_error", expectedStatus: 400 },
        { code: "permission_denied", expectedStatus: 403 },
        { code: "rate_limited", expectedStatus: 429 },
        { code: "conflict", expectedStatus: 409 },
        { code: "unknown", expectedStatus: 400 }, // Default
      ];

      testCases.forEach(({ code, expectedStatus }) => {
        const error = new VisibleError(code as any, "Test error message");
        errorHandler(error, mockContext as Context);

        expect(mockContext.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "Test error message",
            code,
          }),
          expectedStatus
        );
      });
    });

    it("should include details when provided", () => {
      const error = new VisibleError("validation_error", "Invalid input", {
        field: "email",
        reason: "Must be a valid email",
      });

      errorHandler(error, mockContext as Context);

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
    it("should handle PermissionDeniedError with 403 status", () => {
      const error = new PermissionDeniedError("Insufficient permissions");

      errorHandler(error, mockContext as Context);

      // PermissionDeniedError might be treated as a generic Error in current implementation
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Insufficient permissions"),
        }),
        403
      );
    });
  });

  describe("Generic Error handling", () => {
    it("should hide internal errors in production", () => {
      const error = new Error("Database connection failed");

      errorHandler(error, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "An internal error occurred",
          code: "internal_error",
        }),
        500
      );
    });

    it("should show error details in development", async () => {
      const { isDevelopment } = await import("../src/env");
      (isDevelopment as any).mockReturnValue(true);

      const error = new Error("Database connection failed");

      errorHandler(error, mockContext as Context);

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
    it("should handle non-Error objects", () => {
      const error = { weird: "object" };

      errorHandler(error as any, mockContext as Context);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "An unknown error occurred",
          code: "unknown_error",
        }),
        500
      );
    });

    it("should handle string errors", () => {
      const error = "Something went wrong";

      errorHandler(error as any, mockContext as Context);

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
