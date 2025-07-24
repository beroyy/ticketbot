import { defineConfig } from "vitest/config";
import vitestConfig from "@ticketsbot/vitest-config";

export default defineConfig({
  ...vitestConfig,
  test: {
    ...vitestConfig.test,
    environment: "node",
  },
});
