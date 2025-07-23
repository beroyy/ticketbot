import { defineConfig } from "vitest/config";
import baseConfig from "@ticketsbot/vitest-config";

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // API-specific test configuration
  },
});
