import { createAuthClient } from "better-auth/react";

// Create the auth client internally
export const authClient = createAuthClient({
  baseURL: process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4001",
  basePath: "/auth",
});
