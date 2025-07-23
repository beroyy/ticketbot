import { EventEmitter } from "node:events";
import type { z } from "zod";
import { container } from "@sapphire/framework";

/**
 * Generic domain event system for bots
 * Bots can define their own event schemas and use this typed event emitter
 */

/**
 * Base type for event schema definitions
 */
export type EventSchemas = Record<string, z.ZodType<any, any, any>>;

/**
 * Extract event names from schema definitions
 */
export type EventName<T extends EventSchemas> = keyof T & string;

/**
 * Extract event data type from schema
 */
export type EventData<T extends EventSchemas, E extends EventName<T>> = z.infer<T[E]>;

/**
 * Create a typed domain event emitter
 */
export function createDomainEventEmitter<T extends EventSchemas>(schemas: T) {
  class TypedEventEmitter extends EventEmitter {
    override emit<E extends EventName<T>>(event: E, data: EventData<T, E>): boolean {
      // Validate event data
      const schema = schemas[event];
      if (!schema) {
        container.logger.error(`Unknown event: ${event}`);
        return false;
      }

      const result = schema.safeParse(data);

      if (!result.success) {
        container.logger.error(`Invalid event data for ${event}:`, result.error);
        return false;
      }

      // Log event emission
      container.logger.debug(`Domain event emitted: ${event}`, result.data);

      return super.emit(event, result.data);
    }

    override on<E extends EventName<T>>(event: E, listener: (data: EventData<T, E>) => void): this {
      return super.on(event, listener);
    }

    override once<E extends EventName<T>>(
      event: E,
      listener: (data: EventData<T, E>) => void
    ): this {
      return super.once(event, listener);
    }

    override off<E extends EventName<T>>(
      event: E,
      listener: (data: EventData<T, E>) => void
    ): this {
      return super.off(event, listener);
    }

    override addListener<E extends EventName<T>>(
      event: E,
      listener: (data: EventData<T, E>) => void
    ): this {
      return super.addListener(event, listener);
    }

    override removeListener<E extends EventName<T>>(
      event: E,
      listener: (data: EventData<T, E>) => void
    ): this {
      return super.removeListener(event, listener);
    }

    override removeAllListeners(event?: EventName<T>): this {
      return super.removeAllListeners(event);
    }

    override listenerCount(event: EventName<T>): number {
      return super.listenerCount(event);
    }

    override listeners<E extends EventName<T>>(event: E): Array<(data: EventData<T, E>) => void> {
      return super.listeners(event) as Array<(data: EventData<T, E>) => void>;
    }

    override rawListeners<E extends EventName<T>>(
      event: E
    ): Array<(data: EventData<T, E>) => void> {
      return super.rawListeners(event) as Array<(data: EventData<T, E>) => void>;
    }
  }

  return new TypedEventEmitter();
}
