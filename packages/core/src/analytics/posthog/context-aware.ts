import { getPostHogClient } from "./client.js";
import type { EventProperties, ErrorContext } from "../types.js";

interface ContextProvider {
  getContext():
    | {
        userId?: string;
        guildId?: string;
        requestId?: string;
        [key: string]: string | number | boolean | null | undefined;
      }
    | undefined;
}

let contextProvider: ContextProvider | null = null;

export const setContextProvider = (provider: ContextProvider) => {
  contextProvider = provider;
};

const enrichProperties = (properties: EventProperties = {}): EventProperties => {
  if (!contextProvider) return properties;

  const context = contextProvider.getContext();
  if (!context) return properties;

  return {
    ...properties,
    userId: properties.userId || context.userId,
    guildId: properties.guildId || context.guildId,
    requestId: properties.requestId || context.requestId,
  };
};

export const captureEvent = (
  eventName: string,
  properties?: EventProperties,
  distinctId?: string
): void => {
  const client = getPostHogClient();
  const enrichedProperties = enrichProperties(properties);
  const context = contextProvider?.getContext();

  client.capture({
    distinctId: distinctId || context?.userId || "anonymous",
    event: eventName,
    properties: enrichedProperties,
  });
};

export const captureError = (error: Error, context?: ErrorContext, distinctId?: string): void => {
  const enrichedContext = enrichProperties(context || {});

  captureEvent(
    "error",
    {
      ...enrichedContext,
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
    },
    distinctId
  );
};

export const identify = (userId: string, properties?: EventProperties): void => {
  const client = getPostHogClient();
  const enrichedProperties = enrichProperties(properties);

  client.identify({
    distinctId: userId,
    properties: enrichedProperties,
  });
};

export const setPersonProperties = (userId: string, properties: EventProperties): void => {
  const client = getPostHogClient();

  client.capture({
    distinctId: userId,
    event: "$set",
    properties: {
      $set: properties,
    },
  });
};
