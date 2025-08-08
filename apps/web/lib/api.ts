import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";
import { env } from "../env";

// Create the Hono RPC client with proper configuration
const baseURL = env.client.NEXT_PUBLIC_API_URL || "http://localhost:4001";

export const api = hc<AppType>(baseURL, {
  init: {
    credentials: "include", // Always include cookies for authentication
    mode: "cors" as RequestMode, // Explicitly set CORS mode
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },
});
