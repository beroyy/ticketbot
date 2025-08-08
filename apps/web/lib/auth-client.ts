import { createAuthClient } from "better-auth/react";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  basePath: "/auth",
  plugins: [nextCookies()],
});
