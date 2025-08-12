import { AsyncLocalStorage } from "node:async_hooks";

export function createContext<T>() {
  const storage = new AsyncLocalStorage<T>();

  return {
    use() {
      const result = storage.getStore();
      if (!result) throw new Error("No context available");
      return result;
    },

    tryUse() {
      return storage.getStore();
    },

    provide<R>(value: T, fn: () => R): R {
      return storage.run<R>(value, fn);
    },

    async provideAsync<R>(value: T, fn: () => Promise<R>): Promise<R> {
      return storage.run<Promise<R>>(value, fn);
    },
  };
}

export { type DiscordActor, type WebActor, type SystemActor, Actor } from "./actor";

export {
  ContextError,
  ContextNotFoundError,
  PermissionDeniedError,
  TransactionError,
  ActorValidationError,
  VisibleError,
} from "./errors";
