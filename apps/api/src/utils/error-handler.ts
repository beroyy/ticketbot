import type { Context, ErrorHandler } from "hono";
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

export const catchErrors = <T extends unknown[], R>(handler: (...args: T) => Promise<R>) => {
  return async (...args: T): Promise<R | Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const c = args[0] as Context;
      const status = getStatusCode(error);
      const response = await formatError(error);
      return c.json(response, status) as R;
    }
  };
};

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export const toResult = async <T>(promise: Promise<T>): Promise<Result<T>> => {
  try {
    const value = await promise;
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
};

export const handleResult = async <T>(
  c: Context,
  result: Result<T>,
  successStatus = 200
): Promise<Response> => {
  if (result.ok) {
    return c.json(result.value as any, successStatus as any);
  }

  const status = getStatusCode(result.error);
  const response = await formatError(result.error);
  return c.json(response as any, status as any);
};
