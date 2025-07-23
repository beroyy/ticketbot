import { Listener, type Events } from "@sapphire/framework";
import type { ClientEvents } from "discord.js";

/**
 * Listener handler function type
 */
export type ListenerHandler<K extends keyof ClientEvents> = (
  ...args: ClientEvents[K]
) => void | Promise<void>;

/**
 * Configuration for creating a listener
 */
export interface ListenerConfig<K extends keyof ClientEvents> {
  event: K;
  once?: boolean;
  enabled?: boolean;
  handler: ListenerHandler<K>;
}

/**
 * Create a Sapphire listener from a functional handler
 */
export function createListener<K extends keyof ClientEvents>(
  config: ListenerConfig<K>
): typeof Listener {
  class DynamicListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
      super(context, {
        ...options,
        event: config.event as string,
        once: config.once ?? false,
        enabled: config.enabled ?? true,
      });
    }

    public async run(...args: ClientEvents[K]) {
      await config.handler(...args);
    }
  }

  Object.defineProperty(DynamicListener, "name", { value: `${config.event}Listener` });
  return DynamicListener as typeof Listener;
}

/**
 * Create a listener for Sapphire events
 */
export function createSapphireListener<E extends (typeof Events)[keyof typeof Events]>(
  event: E,
  handler: (...args: any[]) => void | Promise<void>
): typeof Listener {
  class SapphireEventListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
      super(context, {
        ...options,
        event: event as string,
      });
    }

    public async run(...args: any[]) {
      await handler(...args);
    }
  }

  Object.defineProperty(SapphireEventListener, "name", { value: `${String(event)}Listener` });
  return SapphireEventListener as typeof Listener;
}

/**
 * Listener factory for creating listeners with a fluent interface
 */
export const ListenerFactory = {
  /**
   * Create a listener that fires on every event
   */
  on<K extends keyof ClientEvents>(event: K, handler: ListenerHandler<K>) {
    return createListener({ event, handler });
  },

  /**
   * Create a listener that fires only once
   */
  once<K extends keyof ClientEvents>(event: K, handler: ListenerHandler<K>) {
    return createListener({ event, once: true, handler });
  },

  /**
   * Create a listener for Sapphire framework events
   */
  sapphire<E extends (typeof Events)[keyof typeof Events]>(
    event: E,
    handler: (...args: any[]) => void | Promise<void>
  ) {
    return createSapphireListener(event, handler);
  },
};
