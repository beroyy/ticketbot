import "@/styles/globals.css";
import "@/lib/zod-config";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { UserProvider } from "@/features/user/ui/user-provider";
import { AuthProviderNoRouter } from "@/features/auth/auth-provider-no-router";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthErrorBoundary } from "@/components/auth-error-boundary";
import { useState } from "react";
import { Inter } from "next/font/google";
import { reportWebVitals as reportWebVitalsToAnalytics } from "@/lib/web-vitals";

// Import Navbar normally to enable SSR and avoid skeleton flash
import { Navbar } from "@/components/navbar";

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

  // Extract auth props from pageProps
  const { session, authState, selectedGuildId, guilds, ...restProps } = pageProps;

  return (
    <div className={`${inter.className} antialiased`}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <AuthErrorBoundary>
              <AuthProviderNoRouter
                initialSession={session}
                initialAuthState={authState}
                initialGuildId={selectedGuildId}
                initialGuilds={guilds}
              >
                <Navbar />
                <Component {...restProps} />
                <Toaster />
              </AuthProviderNoRouter>
            </AuthErrorBoundary>
          </UserProvider>
          {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ErrorBoundary>
    </div>
  );
}

export { reportWebVitalsToAnalytics as reportWebVitals };
