"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { signIn } from "@ticketsbot/core/auth/client";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleConnectDiscord = async () => {
    try {
      await signIn.social({
        provider: "discord",
      });
    } catch (error) {
      console.error("Error connecting Discord:", error);
    }
  };

  override render() {
    if (this.state.hasError) {
      const { error } = this.state;

      // Custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={error!} reset={this.handleReset} />;
      }

      // Check if it's a Discord connection error
      const isDiscordError = error?.message
        ?.toLowerCase()
        .includes("discord account not connected");

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                {isDiscordError ? "Discord Connection Required" : "Something went wrong"}
              </h1>
              <p className="text-gray-600">
                {isDiscordError
                  ? "Please connect your Discord account to continue using the application."
                  : "An unexpected error occurred. Please try refreshing the page."}
              </p>
            </div>

            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error?.message || "An unexpected error occurred"}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              {isDiscordError ? (
                <Button
                  onClick={this.handleConnectDiscord}
                  className="w-full bg-[#5865F2] text-white hover:bg-[#4752C4]"
                >
                  Connect Discord Account
                </Button>
              ) : (
                <Button onClick={this.handleReset} className="w-full gap-2" variant="default">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}

              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                className="w-full gap-2"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && error && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  Show error details (development only)
                </summary>
                <div className="mt-2 rounded border bg-gray-100 p-3 font-mono text-xs">
                  <div className="mb-2 font-semibold">Error:</div>
                  <div className="whitespace-pre-wrap">{error.message}</div>
                  <div className="mb-2 mt-3 font-semibold">Stack:</div>
                  <div className="whitespace-pre-wrap">{error.stack}</div>
                  {this.state.errorInfo && (
                    <>
                      <div className="mb-2 mt-3 font-semibold">Component Stack:</div>
                      <div className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </div>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}
