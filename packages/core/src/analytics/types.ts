export interface AnalyticsConfig {
  apiKey: string;
  host?: string;
  flushAt?: number;
  flushInterval?: number;
  disabled?: boolean;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined | EventProperties | EventProperties[];
}

export interface ErrorContext {
  userId?: string;
  guildId?: string;
  requestId?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  context?: {
    userId?: string;
    guildId?: string;
    requestId?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
  meta?: Record<string, string | number | boolean | null | undefined>;
}
