import type { PostHog } from "posthog-js";
import { setContextProvider } from "../index.js";
import { createLogger } from "../logger/index.js";
import { createMetrics } from "../metrics/index.js";

// For client-side, we use posthog-js
let posthogClient: PostHog | null = null;

export const initializeAnalytics = (
  apiKey: string,
  options?: {
    host?: string;
    disabled?: boolean;
    persistence?: "localStorage" | "sessionStorage" | "cookie" | "memory";
  }
) => {
  if (typeof window === "undefined") {
    console.warn("[Analytics] Attempting to initialize PostHog on server-side");
    return;
  }

  if (!apiKey && !options?.disabled) {
    console.warn("PostHog API key not provided and analytics not explicitly disabled");
    return;
  }

  if (options?.disabled) {
    // PostHog disabled by configuration
    return;
  }

  // Import and initialize posthog-js
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(apiKey, {
      api_host: options?.host || "https://app.posthog.com",
      persistence: options?.persistence || "localStorage",
      autocapture: false, // We'll capture events manually
      capture_pageview: false, // Handle page views manually in Next.js
    });

    posthogClient = posthog;

    // Set up context provider for Web
    setContextProvider({
      getContext: () => {
        // In web, we might get context from React Context or session
        // This is a placeholder - actual implementation depends on your setup
        return {
          userId: posthogClient?.get_distinct_id(),
          sessionId: posthogClient?.get_session_id(),
        };
      },
    });

    // PostHog initialized for Web
  });
};

// Web-specific helpers
export const capturePageView = (url?: string) => {
  if (posthogClient) {
    posthogClient.capture("$pageview", {
      $current_url: url || (typeof window !== "undefined" ? window.location.href : ""),
    });
  }
};

export const setUser = (
  userId: string,
  properties?: Record<string, string | number | boolean | null | undefined>
) => {
  if (posthogClient) {
    posthogClient.identify(userId, properties);
  }
};

export const resetUser = () => {
  if (posthogClient) {
    posthogClient.reset();
  }
};

// Export pre-configured instances
export const webLogger = createLogger("web", {
  consoleOutput: true,
  captureErrors: true,
});

export const webMetrics = createMetrics("web");

// Re-export client for advanced usage
export { posthogClient };
