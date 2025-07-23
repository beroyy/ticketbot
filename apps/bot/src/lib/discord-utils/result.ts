/**
 * Result type for functional error handling
 * Provides a type-safe way to handle errors without exceptions
 */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E; context?: unknown };

/**
 * Create a successful result
 */
export const ok = <T, E = string>(value: T): Result<T, E> => ({ ok: true, value });

/**
 * Create an error result with optional context
 */
export const err = <E>(error: E, context?: unknown): Result<never, E> => {
  const result: Result<never, E> = { ok: false, error };
  if (context) {
    result.context = context;
  }
  return result;
};

/**
 * Type guard to check if a result is successful
 */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;

/**
 * Type guard to check if a result is an error
 */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok;

/**
 * Map a successful result to a new value
 */
export const map = <T, U, E = string>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.ok) {
    return { ok: true, value: fn(result.value) };
  }
  return { ok: false, error: result.error };
};

/**
 * Map an error result to a new error
 */
export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
  return result.ok ? result : err(fn(result.error));
};

/**
 * Chain operations that return Results
 */
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  return result.ok ? fn(result.value) : result;
};

/**
 * Extract the value or throw the error
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error;
};

/**
 * Extract the value or return a default
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.ok ? result.value : defaultValue;
};

/**
 * Convert a promise to a Result
 */
export const fromPromise = async <T>(promise: Promise<T>): Promise<Result<T, string>> => {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Convert a function that might throw to a Result
 */
export const tryCatch = <T>(fn: () => T): Result<T, string> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Combine multiple Results into a single Result containing an array
 */
export const combine = <T, E>(...results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return err(result.error);
    }
    values.push(result.value);
  }

  return ok(values);
};

/**
 * Apply a series of transformations to a Result using pipe pattern
 */
export const pipe =
  <T, E>(...fns: Array<(result: Result<unknown, E>) => Result<unknown, E>>) =>
  (initial: Result<T, E>): Result<unknown, E> => {
    return fns.reduce((result, fn) => fn(result), initial as Result<unknown, E>);
  };

/**
 * Match pattern for Result type
 */
export const match = <T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => R;
    err: (error: E, context?: unknown) => R;
  }
): R => {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error, result.context);
};

/**
 * Match pattern for async Result
 */
export const matchAsync = async <T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => Promise<R> | R;
    err: (error: E, context?: unknown) => Promise<R> | R;
  }
): Promise<R> => {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error, result.context);
};

/**
 * Tap into a successful result without changing it
 */
export const tap =
  <T, E>(fn: (value: T) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (result.ok) fn(result.value);
    return result;
  };

/**
 * Tap into an error result without changing it
 */
export const tapErr =
  <T, E>(fn: (error: E) => void) =>
  (result: Result<T, E>): Result<T, E> => {
    if (!result.ok) fn(result.error);
    return result;
  };

/**
 * Convert Result to a nullable value
 */
export const toNullable = <T, E>(result: Result<T, E>): T | null =>
  result.ok ? result.value : null;

/**
 * Convert Result to an optional value
 */
export const toOptional = <T, E>(result: Result<T, E>): T | undefined =>
  result.ok ? result.value : undefined;

/**
 * Create Result from a nullable value
 */
export const fromNullable = <T>(
  value: T | null | undefined,
  error: string = "Value is null or undefined"
): Result<T> => (value != null ? ok(value) : err(error));

/**
 * Retry an operation that returns a Result
 */
export const retry = async <T>(
  fn: () => Promise<Result<T>>,
  times: number,
  delay: number = 0
): Promise<Result<T>> => {
  let lastError: string = "Unknown error";

  for (let i = 0; i < times; i++) {
    const result = await fn();
    if (result.ok) return result;
    lastError = result.error;
    if (i < times - 1 && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return err(`Failed after ${times} attempts: ${lastError}`);
};
