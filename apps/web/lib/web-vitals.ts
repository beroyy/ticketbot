import type { Metric } from "web-vitals";

const vitalsUrl = "https://vitals.vercel-analytics.com/v1/vitals";

function getConnectionSpeed() {
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  return connection?.effectiveType || "";
}

export function sendToAnalytics(metric: Metric) {
  const body = {
    dsn: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: getConnectionSpeed(),
  };

  if (process.env.NODE_ENV === "development") {
    console.log("[Web Vitals]", metric.name, metric.value, {
      good: metric.rating === "good",
      metric,
    });

    if (metric.name === "CLS" && metric.value > 0.1) {
      console.warn("[CLS Warning] Layout shift detected:", metric.value);
    }
  }

  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ANALYTICS_ID) {
    const blob = new Blob([JSON.stringify(body)], {
      type: "application/json",
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(vitalsUrl, blob);
    } else {
      fetch(vitalsUrl, {
        body: blob,
        method: "POST",
        credentials: "omit",
        keepalive: true,
      });
    }
  }
}

export function reportWebVitals(metric: Metric) {
  sendToAnalytics(metric);
}
