import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AuthSession } from "@ticketsbot/core/auth";
// Import Prisma types directly to avoid namespace type issues
import type { Guild as PrismaGuild, Ticket as PrismaTicket } from "@prisma/client";

/**
 * Centralized type definitions for Hono app environment
 * Replaces the duplicated Variables types across route files
 */
export interface AppEnv {
  Variables: {
    // Auth
    user: AuthSession["user"];
    session: AuthSession;

    // Context
    guildId?: string;
    guild?: PrismaGuild;

    // Route-specific
    ticket?: PrismaTicket;
    ticketId?: bigint;

    // Performance
    requestId: string;
    startTime: number;
  };
  Bindings: Record<string, never>;
}

/**
 * Factory instance for creating type-safe middleware and handlers
 * Provides consistent patterns across all routes
 */
export const factory = createFactory<AppEnv>();

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

/**
 * Typed HTTP exceptions with consistent error responses
 */
export class ApiError extends HTTPException {
  constructor(
    status: number,
    message: string,
    options?: {
      code?: string;
      details?: unknown;
    }
  ) {
    super(status as any, {
      message,
      res: new Response(
        JSON.stringify({
          error: message,
          code: options?.code,
          details: options?.details,
        } satisfies ErrorResponse),
        {
          status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      ),
    });
  }
}

/**
 * Common API errors as static methods
 */
export class ApiErrors {
  static notFound(resource: string) {
    return new ApiError(404, `${resource} not found`, { code: "not_found" });
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message, { code: "unauthorized" });
  }

  static forbidden(message = "Permission denied") {
    return new ApiError(403, message, { code: "forbidden" });
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, { code: "bad_request", details });
  }

  static conflict(message: string) {
    return new ApiError(409, message, { code: "conflict" });
  }

  static rateLimit(message = "Too many requests") {
    return new ApiError(429, message, { code: "rate_limit" });
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message, { code: "internal_error" });
  }
}

/**
 * Type-safe route creation helper
 * Ensures all routes follow the same pattern
 */
export const createRoute = () => factory.createApp();

/**
 * Success response helper
 */
export function successResponse<T>(data?: T): SuccessResponse<T> {
  return { success: true, data };
}

/**
 * Parse Discord ID helpers with validation
 */
export function parseDiscordId(id: string): bigint {
  try {
    const parsed = BigInt(id);
    if (parsed < 0n) {
      throw new ApiError(400, "Invalid Discord ID");
    }
    return parsed;
  } catch {
    throw new ApiError(400, "Invalid Discord ID format");
  }
}

export function parseTicketId(id: string): bigint {
  return parseDiscordId(id);
}

export function parseGuildId(id: string): bigint {
  return parseDiscordId(id);
}

export function parseUserId(id: string): bigint {
  return parseDiscordId(id);
}

/**
 * Async handler wrapper with automatic error handling
 * Catches domain errors and converts them to proper HTTP responses
 */
export const asyncHandler = factory.createHandlers(async (c, next) => {
  try {
    await next();
  } catch (error) {
    // Handle domain-specific errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        throw ApiErrors.notFound(error.message.replace(" not found", ""));
      }
      if (error.message.includes("already exists")) {
        throw ApiErrors.conflict(error.message);
      }
      if (error.message.includes("permission") || error.message.includes("unauthorized")) {
        throw ApiErrors.forbidden(error.message);
      }
    }

    // Re-throw HTTPExceptions
    if (error instanceof HTTPException) {
      throw error;
    }

    // Log unexpected errors
    console.error("Unhandled error:", error);
    throw ApiErrors.internal();
  }
});
