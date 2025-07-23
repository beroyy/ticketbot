import { config as nextConfig } from "@ticketsbot/eslint-config/next.js";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextConfig,
  {
    ignores: [".next/**", "out/**"],
  },
];
