import { config as baseConfig } from "./base.js";
import globals from "globals";

/**
 * ESLint configuration for Node.js applications
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Node.js specific rules
      "no-process-exit": "error",
      "no-sync": "warn",

      // Allow console in Node.js
      "no-console": "off",

      // CommonJS compatibility
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;
