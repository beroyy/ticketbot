import "@/styles/globals.css";
import "@/lib/zod-config";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { UserProvider } from "@/features/user/ui/user-provider";
import { AuthProvider } from "@/features/auth/auth-provider";
import { AppStoreProvider } from "@/shared/stores/app-store-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import { NavbarSkeleton } from "@/components/navbar-skeleton";
import { reportWebVitals as reportWebVitalsToAnalytics } from "@/lib/web-vitals";
import { startPerformanceMonitoring } from "@/lib/performance-monitor";

// Dynamically import Navbar with SSR disabled to avoid router issues during build
const Navbar = dynamic(
  () => import("@/components/navbar").then((mod) => ({ default: mod.Navbar })),
  {
    ssr: false,
    loading: () => <NavbarSkeleton />,
  }
);

const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () => import("@tanstack/react-query-devtools").then((mod) => mod.ReactQueryDevtools),
        {
          ssr: false,
          loading: () => null,
        }
      )
    : () => null;

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
  adjustFontFallback: true,
});

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      startPerformanceMonitoring();
    }
  }, []);

  return (
    <div className={`${inter.className} antialiased`}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <AuthProvider>
              <AppStoreProvider>
                <Navbar />
                <Component {...pageProps} />
                <Toaster />
              </AppStoreProvider>
            </AuthProvider>
          </UserProvider>
          {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ErrorBoundary>
    </div>
  );
}

export { reportWebVitalsToAnalytics as reportWebVitals };
