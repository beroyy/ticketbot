import { config as baseConfig } from "./base.js";
import globals from "globals";

/**
 * ESLint configuration for Next.js applications
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // React rules
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",

      // Allow console in Next.js for server-side logging
      "no-console": "off",

      // Relax some TypeScript rules for Next.js
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];

export default config;
