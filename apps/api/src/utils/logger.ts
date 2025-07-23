/**
 * Centralized logger for the API with environment-based log levels
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

const logLevels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private level: LogLevel;
  private requestLogging: boolean;

  constructor() {
    // Default to 'info' in production, 'debug' in development
    const defaultLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
    this.level = (process.env.LOG_LEVEL as LogLevel) || defaultLevel;
    this.requestLogging = process.env.LOG_REQUESTS === "true";
  }

  private shouldLog(level: LogLevel): boolean {
    return logLevels[level] <= logLevels[this.level];
  }

  error(message: string, error?: Error | unknown, metadata?: any): void {
    if (this.shouldLog("error")) {
      const args: any[] = [`[ERROR] ${message}`];
      if (error !== undefined) args.push(error);
      if (metadata !== undefined) args.push(metadata);
      console.error(...args);
    }
  }

  warn(message: string, metadata?: any): void {
    if (this.shouldLog("warn")) {
      if (metadata !== undefined) {
        console.warn(`[WARN] ${message}`, metadata);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  }

  info(message: string, metadata?: any): void {
    if (this.shouldLog("info")) {
      if (metadata !== undefined) {
        console.log(`[INFO] ${message}`, metadata);
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
  }

  debug(message: string, metadata?: any): void {
    if (this.shouldLog("debug")) {
      if (metadata !== undefined) {
        console.log(`[DEBUG] ${message}`, metadata);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  }

  /**
   * Special method for request logging that respects LOG_REQUESTS env var
   */
  request(method: string, path: string, origin?: string | null): void {
    if (this.requestLogging) {
      console.log(`[REQUEST] ${method} ${path} - Origin: ${origin || "no-origin"}`);
    }
  }
}

export const logger = new Logger();
