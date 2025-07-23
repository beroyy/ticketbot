import type { LogLevel, LogEntry, ErrorContext } from "../types.js";
import { captureEvent } from "../posthog/context-aware.js";

interface LoggerOptions {
  captureErrors?: boolean;
  captureWarnings?: boolean;
  consoleOutput?: boolean;
}

export class Logger {
  private name: string;
  private options: LoggerOptions;
  private contextProvider?: () => ErrorContext;

  constructor(name: string, options: LoggerOptions = {}) {
    this.name = name;
    this.options = {
      captureErrors: true,
      captureWarnings: false,
      consoleOutput: true,
      ...options,
    };
  }

  setContextProvider(provider: () => ErrorContext) {
    this.contextProvider = provider;
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, string | number | boolean | null | undefined>,
    error?: Error
  ): void {
    const context = this.contextProvider?.() || {};

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      context: {
        userId: context.userId,
        guildId: context.guildId,
        requestId: context.requestId,
      },
      meta,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    // Console output
    if (this.options.consoleOutput) {
      const logMethod =
        level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      logMethod(JSON.stringify(entry));
    }

    // Capture to PostHog
    if (
      (level === "error" && this.options.captureErrors) ||
      (level === "warn" && this.options.captureWarnings)
    ) {
      captureEvent(`log_${level}`, {
        logger: this.name,
        message,
        ...entry.context,
        ...meta,
        error: entry.error,
      });
    }
  }

  debug(
    message: string,
    meta?: Record<string, string | number | boolean | null | undefined>
  ): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, string | number | boolean | null | undefined>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, string | number | boolean | null | undefined>): void {
    this.log("warn", message, meta);
  }

  error(
    message: string,
    error?: Error | unknown,
    meta?: Record<string, string | number | boolean | null | undefined>
  ): void {
    if (error instanceof Error) {
      this.log("error", message, meta, error);
    } else {
      this.log("error", message, {
        ...meta,
        errorValue: error !== undefined ? String(error) : undefined,
      });
    }
  }
}

export const createLogger = (name: string, options?: LoggerOptions): Logger => {
  return new Logger(name, options);
};
