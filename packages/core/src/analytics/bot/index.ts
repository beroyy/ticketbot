import { initializePostHog, setContextProvider } from "../index.js";
import { createLogger } from "../logger/index.js";
import { createMetrics } from "../metrics/index.js";
import type { ErrorContext } from "../types.js";
// Bot context will be imported from the bot app when initialized

const logger = createLogger("analytics-bot");

export const initializeAnalytics = (
  apiKey: string,
  options?: {
    host?: string;
    disabled?: boolean;
    contextProvider?: () => ErrorContext;
  }
) => {
  if (!apiKey && !options?.disabled) {
    logger.warn("PostHog API key not provided and analytics not explicitly disabled");
    return;
  }

  // Initialize PostHog
  initializePostHog({
    apiKey: apiKey || "",
    host: options?.host,
    disabled: options?.disabled || !apiKey,
  });

  // Set up context provider for Bot
  if (options?.contextProvider) {
    setContextProvider({
      getContext: options.contextProvider,
    });

    // Set up logger context
    logger.setContextProvider(options.contextProvider);
  }

  logger.info("Analytics initialized for Bot");
};

// Export pre-configured instances
export const botLogger = createLogger("bot");
export const botMetrics = createMetrics("bot");
