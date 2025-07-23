import "@/styles/globals.css";
import "@/lib/zod-config"; // Initialize Zod configuration
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SelectServerProvider } from "@/features/user/ui/select-server-provider";
import { UserProvider } from "@/features/user/ui/user-provider";
import { AppStoreProvider } from "@/shared/stores/app-store-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { useState } from "react";

// Dynamically import Navbar with SSR disabled to avoid router issues during build
const Navbar = dynamic(
  () => import("@/components/navbar").then((mod) => ({ default: mod.Navbar })),
  {
    ssr: false,
  }
);

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <SelectServerProvider>
            <AppStoreProvider>
              <Navbar />
              <Component {...pageProps} />
              <Toaster />
            </AppStoreProvider>
          </SelectServerProvider>
        </UserProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
