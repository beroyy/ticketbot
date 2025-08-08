/**
 * Web-specific logger utility that respects NODE_ENV
 * Only logs debug messages in development mode
 */

import { isDevelopment } from "@/env";

class WebLogger {
  private isDev = isDevelopment();

  debug(...args: any[]): void {
    if (this.isDev) {
      console.log(...args);
    }
  }

  info(...args: any[]): void {
    console.info(...args);
  }

  warn(...args: any[]): void {
    console.warn(...args);
  }

  error(...args: any[]): void {
    console.error(...args);
  }
}

export const logger = new WebLogger();
