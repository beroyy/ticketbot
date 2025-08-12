import config from "@ticketsbot/eslint-config/node.js";

export default [
  ...config,
  {
    ignores: ["**/*.test.ts", "**/*.spec.ts"],
  },
  {
    rules: {
      "@typescript-eslint/no-namespace": "off", // Domain namespaces are a core architectural pattern
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
