import { PostHog } from "posthog-node";
import type { AnalyticsConfig } from "../types.js";

let client: PostHog | null = null;

export const initializePostHog = (config: AnalyticsConfig): PostHog => {
  if (config.disabled) {
    // PostHog disabled by configuration
    client = createNoopClient();
    return client;
  }

  if (client) {
    console.warn("[Analytics] PostHog client already initialized");
    return client;
  }

  client = new PostHog(config.apiKey, {
    host: config.host || "https://app.posthog.com",
    flushAt: config.flushAt || 20,
    flushInterval: config.flushInterval || 10000,
  });

  // PostHog client initialized
  return client;
};

export const getPostHogClient = (): PostHog => {
  if (!client) {
    // Return no-op client if not initialized (e.g., in development)
    console.warn("[Analytics] PostHog client not initialized, using no-op client");
    client = createNoopClient();
  }
  return client;
};

export const shutdown = async (): Promise<void> => {
  if (client) {
    await client.shutdown();
    client = null;
    // PostHog client shut down
  }
};

const createNoopClient = (): PostHog => {
  return {
    capture: () => {},
    identify: () => {},
    alias: () => {},
    groupIdentify: () => {},
    shutdown: async () => {},
    flush: async () => {},
  } as unknown as PostHog;
};
