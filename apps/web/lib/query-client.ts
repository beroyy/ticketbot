import { QueryClient } from "@tanstack/react-query";
import { notify } from "@/shared/stores/app-store";

/**
 * Custom error handler that extracts meaningful error messages
 */
function handleQueryError(error: unknown) {
  // Handle API errors with message property
  if (error && typeof error === "object" && "message" in error) {
    return error.message as string;
  }

  // Handle fetch errors
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback for unknown errors
  return "An unexpected error occurred";
}

/**
 * Determine if an error should be shown to the user
 * Some errors like Discord connection errors should not show notifications
 */
function shouldShowErrorNotification(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Don't show notifications for Discord connection errors
    if (errorMessage.includes("discord account not connected")) {
      return false;
    }

    // Don't show notifications for other auth errors
    if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("access denied") ||
      errorMessage.includes("insufficient permissions") ||
      errorMessage.includes("token expired") ||
      errorMessage.includes("token invalid")
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Create a QueryClient instance with global configuration
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent refetching when window regains focus
        refetchOnWindowFocus: false,
        // Prevent automatic refetching on mount if data exists
        refetchOnMount: false,
        // Keep data fresh for 1 minute
        staleTime: 60 * 1000,
        // Keep data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry only once in production, disable in development
        retry: process.env.NODE_ENV === "production" ? 1 : false,
        // Don't retry on 4xx errors
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Don't retry mutations by default
        retry: false,
        // Global error handler for all mutations
        onError: (error) => {
          // Only show error notifications for certain types of errors
          if (shouldShowErrorNotification(error)) {
            const message = handleQueryError(error);
            notify.error("Operation failed", message);
          } else {
            // Log Discord connection errors for debugging but don't show notifications
            console.debug("Mutation error (not showing notification):", error);
          }
        },
      },
    },
  });
}

/**
 * Helper to add success notification to mutations
 */
export function withSuccessNotification<
  TData = unknown,
  _TError = unknown,
  TVariables = unknown,
  _TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string | ((data: TData) => string)
) {
  return {
    mutationFn,
    onSuccess: (data: TData) => {
      const message = typeof successMessage === "function" ? successMessage(data) : successMessage;
      notify.success(message);
    },
  };
}
