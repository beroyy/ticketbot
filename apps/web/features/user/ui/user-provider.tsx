"use client";

import { authClient } from "@/lib/auth-client";

// UserProvider is now simplified - it just ensures auth session is available
// User data should be accessed directly from useSession() or user queries
export function UserProvider({ children }: { children: React.ReactNode }) {
  // Session hook is called here to ensure it's available throughout the app
  authClient.useSession();

  return <>{children}</>;
}
