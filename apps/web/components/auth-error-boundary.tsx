import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Auth Error]", error, errorInfo);
  }

  handleReset = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("global-storage");
      window.location.href = "/login";
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex justify-center">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              Authentication Error
            </h2>
            <p className="mb-6 text-center text-gray-600">
              We encountered an error with authentication. Please try signing in again.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mb-4 rounded bg-gray-100 p-3 text-xs text-red-600">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                Refresh Page
              </Button>
              <Button onClick={this.handleReset} className="flex-1">
                Sign In Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
