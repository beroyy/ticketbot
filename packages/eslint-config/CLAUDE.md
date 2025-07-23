# @ticketsbot/eslint-config Context

## Purpose

Shared ESLint configurations for the TicketsBot monorepo. Provides consistent linting rules across all packages and applications using ESLint v9's flat config format.

## Configuration Files

- **base.js** - Base configuration for all TypeScript projects
  - TypeScript-ESLint recommended rules
  - Prettier compatibility
  - Turbo plugin for environment variables
  - Relaxed TypeScript rules for flexibility
  
- **node.js** - Node.js specific rules (extends base)
  - All console methods allowed
  - Node.js globals
  - CommonJS compatibility
  
- **next.js** - Next.js specific rules (extends base)
  - Browser + Node.js globals
  - React rule adjustments
  - All console methods allowed

## Key Features

- **ESLint v9 flat config** - Modern configuration format with array-based configs
- **TypeScript support** - Full TypeScript-ESLint integration with relaxed rules
- **Prettier compatibility** - Works alongside Prettier (config applied last)
- **Turbo support** - Enforces declared environment variables

## Code Style Rules

Our ESLint configuration philosophy:

### Allowed Patterns
- `any` type usage where needed (`no-explicit-any`: off)
- Implicit function returns (no return type annotations required)
- Unused variables prefixed with `_`
- Template expressions with any types
- Floating promises and async operations without await

### Enforced Rules
- **Environment variables**: Must be declared for Turbo (`turbo/no-undeclared-env-vars`)
- **Type imports**: Prefer inline type imports (`consistent-type-imports`)
- **Const over let/var**: Use const where possible
- **Strict equality**: Use === except for null checks
- **No debugger**: Prevents debugger statements

### Console Rules
- **base.js**: Only `console.warn` and `console.error` allowed
- **node.js**: All console methods allowed
- **next.js**: All console methods allowed

## Usage

Each package imports the appropriate config directly:

```javascript
// For Node.js packages (API, Bot, Core)
import config from "@ticketsbot/eslint-config/node.js";
export default config;

// For Next.js application
import { config as nextConfig } from "@ticketsbot/eslint-config/next.js";
export default nextConfig;

// For base TypeScript packages
import baseConfig from "@ticketsbot/eslint-config/base.js";
export default baseConfig;
```

## Important Notes

- All configs export pre-built arrays (no spreading needed)
- Uses ESM exports exclusively
- TypeScript rules are intentionally relaxed for developer flexibility
- Prettier handles formatting (ESLint focuses on code quality)

## Ignored Patterns

The following are excluded from linting:
- `**/dist/**`, `**/build/**` - Compiled output
- `**/node_modules/**` - Dependencies
- `**/.turbo/**`, `**/.next/**` - Framework directories
- `**/coverage/**` - Test coverage
- `**/*.config.{js,mjs,ts}` - Configuration files
