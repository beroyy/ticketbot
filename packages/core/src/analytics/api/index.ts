import { initializePostHog, setContextProvider } from "../index.js";
import { createLogger } from "../logger/index.js";
import { createMetrics } from "../metrics/index.js";
import { Actor } from "../../context";

const logger = createLogger("analytics-api");

export const initializeAnalytics = (
  apiKey: string,
  options?: { host?: string; disabled?: boolean }
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

  // Set up context provider for API
  setContextProvider({
    getContext: () => {
      try {
        const actor = Actor.use();
        const guildId =
          actor.type === "discord_user"
            ? actor.properties.guildId
            : actor.type === "web_user"
              ? actor.properties.selectedGuildId
              : undefined;
        const userId =
          actor.type === "system" ? actor.properties.identifier : actor.properties.userId;

        return {
          userId,
          guildId,
          actorType: actor.type,
          permissions:
            actor.type !== "system" ? actor.properties.permissions?.toString() : undefined,
        };
      } catch {
        return undefined;
      }
    },
  });

  // Set up logger context
  logger.setContextProvider(() => {
    try {
      const actor = Actor.use();
      const guildId =
        actor.type === "discord_user"
          ? actor.properties.guildId
          : actor.type === "web_user"
            ? actor.properties.selectedGuildId
            : undefined;
      const userId =
        actor.type === "system" ? actor.properties.identifier : actor.properties.userId;

      return {
        userId,
        guildId,
      };
    } catch {
      return {};
    }
  });

  logger.info("Analytics initialized for API");
};

// Export pre-configured instances
export const apiLogger = createLogger("api");
export const apiMetrics = createMetrics("api");
