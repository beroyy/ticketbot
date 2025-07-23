import baseConfig from "@ticketsbot/eslint-config/base.js";

export default [
  ...baseConfig,
  {
    ignores: ["dist", "node_modules"],
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    // Allow console statements in scripts since they're CLI tools
    files: ["src/**/*.ts", "src/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
];
