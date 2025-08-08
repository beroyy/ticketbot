import { hc } from "hono/client";
import type { AppType } from "@ticketsbot/api";
import { env } from "../env";

export const api = hc<AppType>(env.baseUrl, {
  init: {
    credentials: "include",
    mode: "cors" as RequestMode,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },
});
