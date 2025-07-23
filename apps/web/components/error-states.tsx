import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@ticketsbot/core/auth/client";
import { AlertTriangle, RefreshCw, Zap } from "lucide-react";

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
}

interface DiscordConnectionErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Handles Discord account connection errors specifically
 */
export function DiscordConnectionError({
  message = "Your Discord account is not connected. Please connect your Discord account to continue.",
  onRetry,
  className = "",
}: DiscordConnectionErrorProps) {
  const handleConnectDiscord = async () => {
    try {
      await signIn.social({
        provider: "discord",
        callbackURL: typeof window !== "undefined" ? window.location.href : undefined,
      });
    } catch (error) {
      console.error("Error connecting Discord:", error);
      // If there's an onRetry callback, call it to handle the error
      if (onRetry) {
        onRetry();
      }
    }
  };

  return (
    <div className={`py-8 text-center ${className}`}>
      <Alert className="mx-auto mb-4 max-w-md">
        <Zap className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button onClick={handleConnectDiscord} className="bg-[#5865F2] text-white hover:bg-[#4752C4]">
        Connect Discord Account
      </Button>
    </div>
  );
}

/**
 * Generic error state component with retry functionality
 */
export function GenericErrorState({ error, onRetry, className = "" }: ErrorStateProps) {
  const errorMessage = error?.message || "An unexpected error occurred. Please try again.";

  return (
    <div className={`py-8 text-center ${className}`}>
      <Alert className="mx-auto mb-4 max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Smart error state component that automatically handles different error types
 */
export function SmartErrorState({ error, onRetry, className = "" }: ErrorStateProps) {
  if (!error) return null;

  const errorMessage = error.message.toLowerCase();

  // Handle Discord connection errors
  if (errorMessage.includes("discord account not connected")) {
    return (
      <DiscordConnectionError message={error.message} onRetry={onRetry} className={className} />
    );
  }

  // Handle other auth errors
  if (
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("access denied") ||
    errorMessage.includes("insufficient permissions")
  ) {
    return (
      <div className={`py-8 text-center ${className}`}>
        <Alert className="mx-auto mb-4 max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error.message || "You don't have permission to access this resource."}
          </AlertDescription>
        </Alert>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Handle network/connection errors
  if (
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("network") ||
    errorMessage.includes("connection")
  ) {
    return (
      <div className={`py-8 text-center ${className}`}>
        <Alert className="mx-auto mb-4 max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connection error. Please check your internet connection and try again.
          </AlertDescription>
        </Alert>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Default to generic error state
  return <GenericErrorState error={error} onRetry={onRetry} className={className} />;
}

/**
 * Loading state component for consistency
 */
export function LoadingState({
  message = "Loading...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`py-8 text-center ${className}`}>
      <div className="text-gray-500">{message}</div>
    </div>
  );
}

/**
 * Empty state component for when no data is available
 */
export function EmptyState({
  message = "No data available",
  actionText,
  onAction,
  className = "",
}: {
  message?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`py-8 text-center ${className}`}>
      <div className="mb-4 text-gray-500">{message}</div>
      {actionText && onAction && (
        <Button variant="outline" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
