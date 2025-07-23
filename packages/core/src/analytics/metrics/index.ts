import { captureEvent } from "../posthog/context-aware.js";

export class Metrics {
  private prefix: string;

  constructor(prefix: string = "") {
    this.prefix = prefix;
  }

  private metricName(name: string): string {
    return this.prefix ? `${this.prefix}.${name}` : name;
  }

  increment(name: string, value: number = 1, tags?: Record<string, string | number>): void {
    captureEvent(`metric_${this.metricName(name)}`, {
      metric_type: "counter",
      value,
      ...tags,
    });
  }

  gauge(name: string, value: number, tags?: Record<string, string | number>): void {
    captureEvent(`metric_${this.metricName(name)}`, {
      metric_type: "gauge",
      value,
      ...tags,
    });
  }

  timing(name: string, duration: number, tags?: Record<string, string | number>): void {
    captureEvent(`metric_${this.metricName(name)}`, {
      metric_type: "timing",
      duration_ms: duration,
      ...tags,
    });
  }

  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string | number>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.timing(name, Date.now() - start, { ...tags, status: "success" });
      return result;
    } catch (error) {
      this.timing(name, Date.now() - start, { ...tags, status: "error" });
      throw error;
    }
  }

  measure<T>(name: string, fn: () => T, tags?: Record<string, string | number>): T {
    const start = Date.now();
    try {
      const result = fn();
      this.timing(name, Date.now() - start, { ...tags, status: "success" });
      return result;
    } catch (error) {
      this.timing(name, Date.now() - start, { ...tags, status: "error" });
      throw error;
    }
  }
}

export const createMetrics = (prefix?: string): Metrics => {
  return new Metrics(prefix);
};
