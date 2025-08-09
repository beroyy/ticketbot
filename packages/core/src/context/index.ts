import { AsyncLocalStorage } from "node:async_hooks";
import { ContextMonitoring } from "./monitoring";

/**
 * Creates a context using AsyncLocalStorage for propagating values through async operations
 * Based on ddd-example pattern
 */
export function createContext<T>(name: string = "context") {
  const storage = new AsyncLocalStorage<T>();
  const logger = ContextMonitoring.getLogger();

  return {
    /**
     * Get the current context value
     * @throws Error if no context is available
     */
    use() {
      const result = storage.getStore();
      if (!result) throw new Error("No context available");
      return result;
    },

    /**
     * Get the current context value or return undefined
     */
    tryUse() {
      return storage.getStore();
    },

    /**
     * Provide a context value for the duration of the callback
     */
    provide<R>(value: T, fn: () => R): R {
      logger.debug(`Providing ${name} context`, { contextType: (value as any)?.type });
      const timer = ContextMonitoring.startTimer(`${name}.provide`);
      try {
        return storage.run<R>(value, fn);
      } finally {
        timer.end();
      }
    },

    /**
     * Provide a context value for the duration of an async callback
     */
    async provideAsync<R>(value: T, fn: () => Promise<R>): Promise<R> {
      logger.debug(`Providing async ${name} context`, { contextType: (value as any)?.type });
      return ContextMonitoring.measure(
        `${name}.provideAsync`,
        () => storage.run<Promise<R>>(value, fn),
        { contextType: (value as any)?.type }
      );
    },
  };
}

// Export actor context
export {
  type DiscordActor,
  type WebActor,
  type SystemActor,
  Actor, // This exports both the type and the namespace
} from "./actor";

// Transaction context has been removed - use explicit prisma.$transaction() instead

// Export error types
export {
  ContextError,
  ContextNotFoundError,
  PermissionDeniedError,
  TransactionError,
  ActorValidationError,
  VisibleError,
} from "./errors";

// Export monitoring
export { ContextMonitoring } from "./monitoring";
