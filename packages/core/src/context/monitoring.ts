/**
 * Performance monitoring and logging for the context system
 */

interface PerformanceMetrics {
  operation: string;
  duration: number;
  contextType?: string;
  metadata?: Record<string, any>;
}

interface ContextLogger {
  debug: (message: string, metadata?: any) => void;
  info: (message: string, metadata?: any) => void;
  warn: (message: string, metadata?: any) => void;
  error: (message: string, error?: Error, metadata?: any) => void;
}

// Log levels for configuration
const logLevels: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Get current log level from environment
const getCurrentLogLevel = (): string => {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel && logLevels[envLevel] !== undefined) {
    return envLevel;
  }
  // Default to 'info' in production, 'debug' in development
  return process.env.NODE_ENV === "production" ? "info" : "debug";
};

// Check if a log level should be logged
const shouldLog = (level: string): boolean => {
  const currentLevel = getCurrentLogLevel();
  const levelValue = logLevels[level];
  const currentLevelValue = logLevels[currentLevel];
  return (
    levelValue !== undefined && currentLevelValue !== undefined && levelValue <= currentLevelValue
  );
};

// Default logger - can be overridden
let logger: ContextLogger = {
  debug: (message: string, metadata?: any) => {
    if (shouldLog("debug")) {
      console.debug(`[Context] ${message}`, metadata);
    }
  },
  info: (message: string, metadata?: any) => {
    if (shouldLog("info")) {
      console.info(`[Context] ${message}`, metadata);
    }
  },
  warn: (message: string, metadata?: any) => {
    if (shouldLog("warn")) {
      console.warn(`[Context] ${message}`, metadata);
    }
  },
  error: (message: string, error?: Error, metadata?: any) => {
    if (shouldLog("error")) {
      console.error(`[Context] ${message}`, error, metadata);
    }
  },
};

// Performance metrics collection
const metricsCollector: ((metrics: PerformanceMetrics) => void)[] = [];

export const ContextMonitoring = {
  /**
   * Set a custom logger implementation
   */
  setLogger(customLogger: ContextLogger): void {
    logger = customLogger;
  },

  /**
   * Get the current logger
   */
  getLogger(): ContextLogger {
    return logger;
  },

  /**
   * Add a metrics collector
   */
  addMetricsCollector(collector: (metrics: PerformanceMetrics) => void): void {
    metricsCollector.push(collector);
  },

  /**
   * Record performance metrics
   */
  recordMetric(metrics: PerformanceMetrics): void {
    // Log slow operations (only in development)
    if (metrics.duration > 100 && process.env.NODE_ENV !== 'production') {
      logger.warn(`Slow context operation: ${metrics.operation}`, {
        duration: `${metrics.duration}ms`,
        ...metrics.metadata,
      });
    }

    // Send to collectors
    metricsCollector.forEach((collector) => {
      try {
        collector(metrics);
      } catch (error) {
        logger.error(
          "Metrics collector error",
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  },

  /**
   * Measure the duration of an operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;

      ContextMonitoring.recordMetric({
        operation,
        duration,
        metadata,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      ContextMonitoring.recordMetric({
        operation,
        duration,
        metadata: { ...metadata, error: true },
      });

      throw error;
    }
  },

  /**
   * Create a timer for manual timing
   */
  startTimer(operation: string, metadata?: Record<string, any>) {
    const start = performance.now();

    return {
      end: (additionalMetadata?: Record<string, any>) => {
        const duration = performance.now() - start;
        ContextMonitoring.recordMetric({
          operation,
          duration,
          metadata: { ...metadata, ...additionalMetadata },
        });
      },
    };
  },
};
