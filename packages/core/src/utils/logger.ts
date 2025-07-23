/**
 * Centralized logger utility for the TicketsBot monorepo.
 * Respects LOG_LEVEL environment variable for filtering output.
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private level: number;
  private prefix: string;

  constructor(prefix?: string) {
    const envLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
    this.level = LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
    this.prefix = prefix ? `[${prefix}] ` : "";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= this.level;
  }

  error(...args: any[]): void {
    if (this.shouldLog("error")) {
      console.error(this.prefix, ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.prefix, ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log(this.prefix, ...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.log(this.prefix, ...args);
    }
  }

  /**
   * Creates a child logger with an additional prefix
   */
  child(prefix: string): Logger {
    const combinedPrefix = this.prefix ? `${this.prefix.slice(0, -2)}:${prefix}` : prefix;
    return new Logger(combinedPrefix);
  }
}

// Create a default logger instance
export const logger = new Logger();

// Export factory function for creating named loggers
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}
