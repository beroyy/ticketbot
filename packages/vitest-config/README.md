# @ticketsbot/vitest-config

Shared Vitest configuration for the TicketsBot monorepo.

## Usage

Create a `vitest.config.ts` in your package:

```typescript
import { defineConfig } from "vitest/config";
import baseConfig from "@ticketsbot/vitest-config";

export default defineConfig({
  ...baseConfig,
  // Add package-specific overrides here
});
```
