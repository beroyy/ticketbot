// Core exports
export {
  type AnalyticsConfig,
  type EventProperties,
  type ErrorContext,
  type LogLevel,
  type LogEntry,
} from "./types.js";

// PostHog client
export { initializePostHog, getPostHogClient, shutdown } from "./posthog/client.js";

// Context-aware tracking
export {
  setContextProvider,
  captureEvent,
  captureError,
  identify,
  setPersonProperties,
} from "./posthog/context-aware.js";

// Logger
export { Logger, createLogger } from "./logger/index.js";

// Metrics
export { Metrics, createMetrics } from "./metrics/index.js";
