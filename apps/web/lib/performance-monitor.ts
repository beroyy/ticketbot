const PERFORMANCE_THRESHOLDS = {
  CLS: 0.1,
  LCP: 2500,
  FID: 100,
  FCP: 1800,
  TTFB: 800,
} as const;

interface PerformanceIssue {
  type: "warning" | "error";
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
}

class PerformanceMonitor {
  private issues: PerformanceIssue[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      this.initializeObserver();
    }
  }

  private initializeObserver() {
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.analyzeEntry(entry);
        }
      });

      this.observer.observe({
        type: "largest-contentful-paint",
        buffered: true,
      });

      this.observer.observe({
        type: "first-input",
        buffered: true,
      });

      this.observer.observe({
        type: "layout-shift",
        buffered: true,
      });

      this.observer.observe({
        type: "navigation",
        buffered: true,
      });
    } catch (error) {
      console.warn("[Performance Monitor] Failed to initialize:", error);
    }
  }

  private analyzeEntry(entry: PerformanceEntry) {
    if (process.env.NODE_ENV !== "development") return;

    switch (entry.entryType) {
      case "largest-contentful-paint":
        this.checkLCP(entry as PerformanceEntry & { startTime: number });
        break;
      case "first-input":
        this.checkFID(entry as PerformanceEntry & { processingStart: number; startTime: number });
        break;
      case "layout-shift":
        this.checkCLS(entry as PerformanceEntry & { value: number; hadRecentInput: boolean });
        break;
      case "navigation":
        this.checkTTFB(entry as PerformanceNavigationTiming);
        break;
    }
  }

  private checkLCP(entry: PerformanceEntry & { startTime: number }) {
    if (entry.startTime > PERFORMANCE_THRESHOLDS.LCP) {
      this.reportIssue({
        type: "warning",
        metric: "LCP",
        value: entry.startTime,
        threshold: PERFORMANCE_THRESHOLDS.LCP,
        message: `Largest Contentful Paint is slow (${entry.startTime.toFixed(0)}ms). Consider optimizing images, preloading critical resources, or improving server response time.`,
        timestamp: Date.now(),
      });
    }
  }

  private checkFID(entry: PerformanceEntry & { processingStart: number; startTime: number }) {
    const fid = entry.processingStart - entry.startTime;
    if (fid > PERFORMANCE_THRESHOLDS.FID) {
      this.reportIssue({
        type: "warning",
        metric: "FID",
        value: fid,
        threshold: PERFORMANCE_THRESHOLDS.FID,
        message: `First Input Delay is high (${fid.toFixed(0)}ms). Consider reducing JavaScript execution time or using web workers.`,
        timestamp: Date.now(),
      });
    }
  }

  private checkCLS(entry: PerformanceEntry & { value: number; hadRecentInput: boolean }) {
    if (!entry.hadRecentInput && entry.value > 0.1) {
      this.reportIssue({
        type: "warning",
        metric: "CLS",
        value: entry.value,
        threshold: PERFORMANCE_THRESHOLDS.CLS,
        message: `Layout shift detected (${entry.value.toFixed(3)}). Check for images without dimensions, dynamic content, or web fonts.`,
        timestamp: Date.now(),
      });
    }
  }

  private checkTTFB(entry: PerformanceNavigationTiming) {
    const ttfb = entry.responseStart - entry.requestStart;
    if (ttfb > PERFORMANCE_THRESHOLDS.TTFB) {
      this.reportIssue({
        type: "warning",
        metric: "TTFB",
        value: ttfb,
        threshold: PERFORMANCE_THRESHOLDS.TTFB,
        message: `Time to First Byte is slow (${ttfb.toFixed(0)}ms). Consider optimizing server response time or using a CDN.`,
        timestamp: Date.now(),
      });
    }
  }

  private reportIssue(issue: PerformanceIssue) {
    this.issues.push(issue);

    if (process.env.NODE_ENV === "development") {
      const color = issue.type === "error" ? "#ef4444" : "#f59e0b";
      console.warn(
        `%c[Performance ${issue.type.toUpperCase()}]`,
        `color: ${color}; font-weight: bold;`,
        issue.message
      );
    }
  }

  checkPreloadUsage() {
    if (typeof window === "undefined") return;

    const preloadLinks = document.querySelectorAll('link[rel="preload"]');

    preloadLinks.forEach((link) => {
      const href = (link as HTMLLinkElement).href;
      const as = (link as HTMLLinkElement).getAttribute("as");

      setTimeout(() => {
        const isUsed = this.isResourceUsed(href, as);
        if (!isUsed) {
          console.warn(
            "%c[Preload Warning]",
            "color: #f59e0b; font-weight: bold;",
            `Preloaded resource not used within 3 seconds: ${href}`
          );
        }
      }, 3000);
    });
  }

  private isResourceUsed(href: string, resourceType: string | null): boolean {
    switch (resourceType) {
      case "image":
        return Array.from(document.images).some((img) => img.src === href);
      case "font":
        return (
          document.fonts &&
          Array.from(document.fonts).some(
            (font) => font.status === "loaded" && href.includes(font.family.toLowerCase())
          )
        );
      case "script":
        return Array.from(document.scripts).some((script) => script.src === href);
      case "style":
        return Array.from(document.styleSheets).some((sheet) => sheet.href === href);
      default:
        return true;
    }
  }

  getIssues(): PerformanceIssue[] {
    return [...this.issues];
  }

  clearIssues() {
    this.issues = [];
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function startPerformanceMonitoring() {
  if (typeof window === "undefined") return;

  const monitor = getPerformanceMonitor();

  if (document.readyState === "complete") {
    monitor.checkPreloadUsage();
  } else {
    window.addEventListener("load", () => {
      monitor.checkPreloadUsage();
    });
  }

  return monitor;
}

export function stopPerformanceMonitoring() {
  if (performanceMonitor) {
    performanceMonitor.destroy();
    performanceMonitor = null;
  }
}
