import { createAuthClient } from "better-auth/react";

// Create the auth client internally
const authClient = createAuthClient({
  baseURL: (process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4001") + "/auth",
});

// Export methods with any type to avoid Next.js build issues
// The actual types are inferred correctly at runtime
export const signIn: any = authClient.signIn;
export const signOut: any = authClient.signOut;
export const useSession: any = authClient.useSession;
