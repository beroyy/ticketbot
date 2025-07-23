/**
 * Type-safe error handling for tickets feature
 */

export interface TicketError {
  message: string;
  code?: string | undefined;
  statusCode?: number | undefined;
  details?: unknown;
  timestamp: string;
}

export class TicketApiError extends Error implements TicketError {
  code?: string | undefined;
  statusCode?: number | undefined;
  details?: unknown;
  timestamp: string;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "TicketApiError";
    this.code = options?.code;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Transform unknown errors into TicketError format
 */
export function formatTicketError(error: unknown): TicketError {
  if (error instanceof TicketApiError) {
    return error;
  }

  if (error instanceof Error) {
    // Check if it's an API response error
    const apiError = error as Error & {
      code?: string;
      response?: {
        status?: number;
        data?: unknown;
      };
    };

    return {
      message: apiError.message || "An unexpected error occurred",
      code: apiError.code || "UNKNOWN_ERROR",
      statusCode: apiError.response?.status,
      details: apiError.response?.data || apiError,
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback for non-Error objects
  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    details: error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * User-friendly error messages based on error codes
 */
export function getTicketErrorMessage(error: TicketError): string {
  const errorMessages: Record<string, string> = {
    NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection.",
    UNAUTHORIZED: "You don't have permission to view tickets.",
    FORBIDDEN: "Access denied. Please contact an administrator.",
    NOT_FOUND: "The requested ticket was not found.",
    SERVER_ERROR: "Server error. Please try again later.",
    TIMEOUT: "Request timed out. Please try again.",
  };

  // Check status codes
  if (error.statusCode) {
    if (error.statusCode === 401) return errorMessages["UNAUTHORIZED"]!;
    if (error.statusCode === 403) return errorMessages["FORBIDDEN"]!;
    if (error.statusCode === 404) return errorMessages["NOT_FOUND"]!;
    if (error.statusCode >= 500) return errorMessages["SERVER_ERROR"]!;
  }

  // Check error codes
  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code]!;
  }

  // Fallback to original message
  return error.message;
}
