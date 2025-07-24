# @ticketsbot/tsconfig Context

## Purpose

Shared TypeScript configurations for the TicketsBot monorepo. Provides a balanced approach to type safety that prioritizes developer experience while maintaining code quality.

## Configuration Files

- **base.json** - Base configuration with balanced strict settings
- **node.json** - Node.js specific settings (CommonJS modules)
- **nextjs.json** - Next.js specific settings (DOM types, JSX)
- **library.json** - For buildable packages (declaration files)

## Configuration Philosophy

Our TypeScript setup balances strict type checking with practical development needs:

- **Safety First**: Core safety features enabled (strictNullChecks, noImplicitAny)
- **Developer Experience**: Overly restrictive rules disabled during development
- **Library Compatibility**: Settings adjusted for real-world library usage

## Key Settings

### All Configurations

- **Target**: ES2022 for modern JavaScript features
- **Lib**: ES2022 (plus DOM for Next.js)
- **Skip Lib Check**: Enabled for faster builds

### Strict Mode (Balanced Approach)

**Enabled**:

- `strict: true` (base setting)
- `noUncheckedIndexedAccess: true` - Safer array/object access
- `strictNullChecks: true` - Null/undefined safety
- `useUnknownInCatchVariables: true` - Safer error handling
- `noImplicitOverride: true` - Explicit override keyword
- `noImplicitReturns: true` - All code paths must return

**Disabled for Flexibility**:

- `exactOptionalPropertyTypes: false` - Too restrictive for many libraries
- `strictPropertyInitialization: false` - Issues with decorators
- `noUnusedLocals: false` - Too restrictive during development
- `noUnusedParameters: false` - Too restrictive during development

### Module Systems

- **base.json**: ESNext modules with bundler resolution
- **node.json**: CommonJS for Node.js compatibility
- **nextjs.json**: ESNext modules for modern web
- **library.json**: ESNext modules for packages

### Build Settings

- **Incremental**: Enabled for faster rebuilds
- **Source Maps**: Enabled for debugging
- **Declaration Maps**: Enabled for go-to-definition
- **Composite**: Disabled (not using project references)

## Usage Examples

### Node.js Applications (API, Bot)

```json
{
  "extends": "@ticketsbot/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Next.js Application

```json
{
  "extends": "@ticketsbot/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

### Core Package (Library)

```json
{
  "extends": "@ticketsbot/tsconfig/library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Scripts Package

```json
{
  "extends": "@ticketsbot/tsconfig/base.json",
  "compilerOptions": {
    "noEmit": true
  }
}
```

## Important Notes

- **Module Resolution**: `bundler` for base/library, `node` for Node.js apps
- **Allow JS**: Enabled for Node.js and Next.js, disabled for libraries
- **No Emit**: Enabled for Next.js (handled by Next.js compiler)
- **Declaration Files**: Generated for library builds only
