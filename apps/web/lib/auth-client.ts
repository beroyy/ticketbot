import { createAuthClient } from "better-auth/react";

/**
 * Auth client for better-auth integration
 * Note: Using ReturnType to capture the client type without referencing internal modules
 */
type AuthClientType = ReturnType<typeof createAuthClient>;

export const authClient: AuthClientType = createAuthClient({
  baseURL: process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4001",
  basePath: "/auth",
});
