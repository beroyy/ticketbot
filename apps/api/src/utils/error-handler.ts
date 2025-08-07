import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import {
  Actor,
  VisibleError,
  TransactionError,
  ContextNotFoundError,
  PermissionDeniedError,
} from "@ticketsbot/core/context";
import { env } from "../env";
import { formatZodError } from "./validation";

type ErrorResponse = {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
};

const getStatusCode = (error: unknown) => {
  if (error instanceof HTTPException) return error.status as any;
  if (error instanceof ZodError) return 400 as const;
  if (error instanceof PermissionDeniedError) return 403 as const;
  if (error instanceof ContextNotFoundError) return 500 as const;
  if (error instanceof TransactionError) return 500 as const;
  if (error instanceof VisibleError) {
    switch (error.code) {
      case "not_found":
        return 404 as const;
      case "validation_error":
      case "invalid_input":
        return 400 as const;
      case "permission_denied":
      case "unauthorized":
        return 403 as const;
      case "rate_limited":
        return 429 as const;
      case "conflict":
        return 409 as const;
      default:
        return 400 as const;
    }
  }
  return 500 as const;
};

const formatError = async (error: unknown): Promise<ErrorResponse> => {
  const actor = Actor.maybeUse();
  const requestId =
    actor && actor.type === "web_user" ? actor.properties.session.session.id : undefined;

  if (error instanceof HTTPException) {
    const response = error.getResponse();
    if (response instanceof Response) {
      try {
        const body = (await response.clone().json()) as any;
        return {
          error: body.error || error.message,
          code: body.code || "http_error",
          details: body.details,
          requestId,
        };
      } catch {
        return {
          error: error.message,
          code: "http_error",
          requestId,
        };
      }
    }
    return {
      error: error.message,
      code: "http_error",
      requestId,
    };
  }

  if (error instanceof ZodError) {
    const formatted = formatZodError(error);
    return {
      error: formatted.error,
      code: formatted.code,
      details: env.isDev() ? formatted.details : formatted.formatted,
      requestId,
    };
  }

  if (error instanceof VisibleError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
      requestId,
    };
  }

  if (error instanceof Error) {
    if (env.isDev()) {
      return {
        error: error.message,
        code: "internal_error",
        details: {
          name: error.name,
          stack: error.stack,
        },
        requestId,
      };
    }

    console.error("Internal error:", error);
    return {
      error: "An internal error occurred",
      code: "internal_error",
      requestId,
    };
  }

  console.error("Unknown error type:", error);
  return {
    error: "An unknown error occurred",
    code: "unknown_error",
    requestId,
  };
};

export const errorHandler: ErrorHandler = async (err, c) => {
  const status = getStatusCode(err);
  const response = await formatError(err);

  return c.json(response, status);
};

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
