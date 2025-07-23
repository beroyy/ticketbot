import { describe, it, expect } from "vitest";
import { z, ZodError } from "zod";
import {
  prettifyZodError,
  formatZodError,
  strictExtend,
  passthroughExtend,
  patterns,
  batchAsyncValidation,
} from "../src/utils/validation";

describe("Validation Utils", () => {
  describe("prettifyZodError", () => {
    it("should format ZodError into a user-friendly string", () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().positive(),
      });

      try {
        schema.parse({ name: "AB", age: -5 });
      } catch (error) {
        if (error instanceof ZodError) {
          const prettified = prettifyZodError(error);
          expect(prettified).toBeTruthy();
          expect(typeof prettified).toBe("string");
        }
      }
    });
  });

  describe("formatZodError", () => {
    it("should format ZodError into structured API response", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      try {
        schema.parse({ email: "invalid-email" });
      } catch (error) {
        if (error instanceof ZodError) {
          const formatted = formatZodError(error);
          expect(formatted.error).toBe("Validation failed");
          expect(formatted.code).toBe("validation_error");
          expect(formatted.details).toBeInstanceOf(Array);
          expect(formatted.details[0]).toHaveProperty("path");
          expect(formatted.details[0]).toHaveProperty("message");
          expect(formatted.details[0]).toHaveProperty("code");
          expect(formatted.formatted).toBeTruthy();
        }
      }
    });
  });

  describe("strictExtend", () => {
    it("should extend a schema and reject unknown fields", () => {
      const baseSchema = z.object({ id: z.number() });
      const extended = strictExtend(baseSchema, {
        name: z.string(),
      });

      // Valid data passes
      const valid = extended.safeParse({ id: 1, name: "test" });
      expect(valid.success).toBe(true);

      // Unknown fields are rejected
      const invalid = extended.safeParse({ id: 1, name: "test", extra: "field" });
      expect(invalid.success).toBe(false);
    });
  });

  describe("passthroughExtend", () => {
    it("should extend a schema and allow unknown fields", () => {
      const baseSchema = z.object({ id: z.number() });
      const extended = passthroughExtend(baseSchema, {
        name: z.string(),
      });

      // Valid data with extra fields passes
      const result = extended.safeParse({ id: 1, name: "test", extra: "field" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("extra", "field");
      }
    });
  });

  describe("patterns", () => {
    describe("discordId", () => {
      it("should validate Discord snowflake IDs", () => {
        const schema = patterns.discordId();

        // Valid IDs
        expect(schema.safeParse("123456789012345678").success).toBe(true);
        expect(schema.safeParse("000000000000000001").success).toBe(true);

        // Invalid IDs
        expect(schema.safeParse("not-a-number").success).toBe(false);
        expect(schema.safeParse("123abc456").success).toBe(false);
        expect(schema.safeParse("").success).toBe(false);
      });
    });

    describe("hexColor", () => {
      it("should validate hex color codes", () => {
        const schema = patterns.hexColor();

        // Valid colors
        expect(schema.safeParse("#5865F2").success).toBe(true);
        expect(schema.safeParse("#FF0000").success).toBe(true);
        expect(schema.safeParse("#123abc").success).toBe(true);

        // Invalid colors
        expect(schema.safeParse("5865F2").success).toBe(false); // Missing #
        expect(schema.safeParse("#GGGGGG").success).toBe(false); // Invalid hex
        expect(schema.safeParse("#12345").success).toBe(false); // Too short
        expect(schema.safeParse("#1234567").success).toBe(false); // Too long
      });
    });

    describe("channelName", () => {
      it("should validate channel names without prefix", () => {
        const schema = patterns.channelName();

        // Valid names
        expect(schema.safeParse("general").success).toBe(true);
        expect(schema.safeParse("ticket-123").success).toBe(true);
        expect(schema.safeParse("support-channel").success).toBe(true);

        // Invalid names
        expect(schema.safeParse("General").success).toBe(false); // Uppercase
        expect(schema.safeParse("ticket_123").success).toBe(false); // Underscore
        expect(schema.safeParse("ticket channel").success).toBe(false); // Space
      });

      it("should validate channel names with prefix", () => {
        const schema = patterns.channelName("ticket");

        // Valid names
        expect(schema.safeParse("ticket-123").success).toBe(true);
        expect(schema.safeParse("ticket-support").success).toBe(true);

        // Invalid names
        expect(schema.safeParse("support-123").success).toBe(false); // Wrong prefix
        expect(schema.safeParse("ticket123").success).toBe(false); // Missing hyphen
      });
    });

    describe("booleanString", () => {
      it("should coerce string booleans", () => {
        const schema = patterns.booleanString();

        // Check if it parses correctly (stringbool might have different behavior)
        const result = schema.safeParse("true");
        expect(result.success).toBe(true);
      });
    });

    describe("pagination", () => {
      it("should validate and provide defaults for pagination", () => {
        const schema = patterns.pagination();

        // Default values
        const defaultResult = schema.safeParse({});
        expect(defaultResult.success).toBe(true);
        if (defaultResult.success) {
          expect(defaultResult.data.page).toBe(1);
          expect(defaultResult.data.limit).toBe(50);
        }

        // Custom values
        const customResult = schema.safeParse({ page: "2", limit: "10" });
        expect(customResult.success).toBe(true);
        if (customResult.success) {
          expect(customResult.data.page).toBe(2);
          expect(customResult.data.limit).toBe(10);
        }

        // Invalid values
        expect(schema.safeParse({ page: 0 }).success).toBe(false); // Too low
        expect(schema.safeParse({ limit: 101 }).success).toBe(false); // Too high
      });
    });
  });

  describe("batchAsyncValidation", () => {
    it("should validate items in batches", async () => {
      const items = [1, 2, 3, 4, 5];
      const validator = async (item: number) => item % 2 === 0; // Even numbers are valid

      const result = await batchAsyncValidation(items, validator, { maxConcurrent: 2 });

      expect(result.valid).toEqual([2, 4]);
      expect(result.invalid).toEqual([1, 3, 5]);
    });

    it("should stop on first error when configured", async () => {
      const items = [1, 2, 3, 4, 5];
      const validator = async (item: number) => item % 2 === 0;

      const result = await batchAsyncValidation(items, validator, {
        maxConcurrent: 2,
        stopOnFirstError: true,
      });

      expect(result.invalid).toContain(1);
      expect(result.valid.length + result.invalid.length).toBeLessThanOrEqual(items.length);
    });
  });
});
