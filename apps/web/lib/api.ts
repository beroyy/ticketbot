import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";
import { env } from "../env";

const baseURL = env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

export const api = hc<AppType>(baseURL, {
  init: {
    credentials: "include",
    mode: "cors" as RequestMode,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },
});
