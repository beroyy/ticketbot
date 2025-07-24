# @ticketsbot/eslint-config

Shared ESLint configurations for the TicketsBot monorepo. Provides consistent linting rules across all packages using ESLint v9's flat config format.

## Available Configurations

### `base.js`

Core configuration for all TypeScript projects. Includes:

- TypeScript-ESLint recommended rules
- Prettier compatibility
- Turbo plugin for monorepo support
- Relaxed rules for modern TypeScript patterns

### `node.js`

Extends base config for Node.js applications (API, Bot, Core):

- Node.js globals
- Allows all console methods
- CommonJS compatibility
- Prevents `process.exit()` usage

### `next.js`

Extends base config for Next.js applications:

- Browser + Node.js globals
- React-specific rule adjustments
- Server-side console logging allowed

## Usage

Import the appropriate config in your `eslint.config.js`:

```javascript
// For Node.js packages (API, Bot, Core)
import config from "@ticketsbot/eslint-config/node.js";
export default config;

// For Next.js applications
import config from "@ticketsbot/eslint-config/next.js";
export default config;

// For general TypeScript packages
import config from "@ticketsbot/eslint-config/base.js";
export default config;
```

## Key Features

- **ESLint v9 Flat Config** - Modern configuration format
- **TypeScript Support** - Full typescript-eslint integration
- **Prettier Compatible** - Works alongside Prettier formatting
- **Turbo Plugin** - Catches undeclared environment variables
- **Relaxed Rules** - Allows `any` types and implicit returns for flexibility

## Configuration Philosophy

Our ESLint setup prioritizes:

1. **Developer Experience** - Warnings instead of errors for non-critical issues
2. **Modern Patterns** - Supports arrow functions, type inference, destructuring
3. **Practical Rules** - Disables overly strict TypeScript checks
4. **Monorepo Aware** - Includes Turborepo-specific rules

## Rule Highlights

### Allowed Patterns

- `any` type when needed
- Implicit function returns
- Console warnings and errors
- Unused vars prefixed with `_`

### Enforced Rules

- Consistent type imports
- No var declarations (const/let only)
- Strict equality checks
- No debugger statements
- Turbo environment variable declarations

### Ignored Paths

- `dist/`, `build/` - Compiled output
- `node_modules/` - Dependencies
- `.turbo/`, `.next/` - Framework directories
- `coverage/` - Test coverage
- `*.config.{js,mjs,ts}` - Configuration files

## Dependencies

- `@typescript-eslint/*` - TypeScript linting
- `eslint-config-prettier` - Prettier compatibility
- `eslint-plugin-turbo` - Turborepo support
- `globals` - Environment globals
