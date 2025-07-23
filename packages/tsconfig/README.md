# @ticketsbot/tsconfig

Shared TypeScript configurations for the TicketsBot monorepo. Provides consistent, pragmatic TypeScript settings that balance type safety with developer productivity.

## Overview

This package provides four TypeScript configurations tailored for different use cases:

- **`base.json`** - Foundation config with balanced strict settings
- **`node.json`** - Node.js applications (CommonJS modules)
- **`nextjs.json`** - Next.js applications (DOM types, JSX)
- **`library.json`** - Publishable packages (declaration files)

## Quick Start

Install the package (already included in monorepo):

```bash
pnpm add -D @ticketsbot/tsconfig
```

Extend the appropriate config in your `tsconfig.json`:

```json
{
  "extends": "@ticketsbot/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Configuration Strategy

Our TypeScript configuration philosophy:

### 🛡️ Safety Without Suffering

We enable core safety features while disabling overly restrictive rules that harm developer experience:

- ✅ **Null safety** (`strictNullChecks`)
- ✅ **Type safety** (`noImplicitAny`) 
- ✅ **Array bounds** (`noUncheckedIndexedAccess`)
- ❌ **Unused vars** (warnings only during dev)
- ❌ **Exact optionals** (breaks with many libraries)

### 🚀 Modern JavaScript

All configs target ES2022 for access to:
- Top-level await
- Private class fields
- Array/Object methods (`.at()`, `Object.hasOwn()`)
- Error cause property

### ⚡ Fast Builds

- Skip library type checking (`skipLibCheck`)
- Incremental compilation (`incremental`)
- Optimized module resolution

## Configuration Details

### base.json

Foundation configuration for TypeScript projects:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

**Use for**: Utility packages, scripts, tools

**Key features**:
- ESNext modules with bundler resolution
- Declaration files enabled
- Balanced strict mode
- No JavaScript files allowed

### node.json

Optimized for Node.js applications:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "allowJs": true
  }
}
```

**Use for**: API servers, Discord bots, CLIs

**Key features**:
- CommonJS modules for Node.js compatibility
- Node module resolution
- JavaScript files allowed
- Inherits strict settings from base

### nextjs.json

Tailored for Next.js applications:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "noEmit": true,
    "allowJs": true
  }
}
```

**Use for**: Next.js web applications

**Key features**:
- DOM type definitions
- JSX support (preserved for Next.js compiler)
- No emit (Next.js handles compilation)
- Includes Next.js type definitions

### library.json

For publishable packages:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": true
  }
}
```

**Use for**: Shared packages, npm libraries

**Key features**:
- Declaration files with source maps
- No direct emit (use build tool)
- Strict type checking
- ESNext modules

## Usage by Package Type

### Node.js API Server

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
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Core Package

```json
{
  "extends": "@ticketsbot/tsconfig/library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Script Package

```json
{
  "extends": "@ticketsbot/tsconfig/base.json",
  "compilerOptions": {
    "noEmit": true
  }
}
```

## Key Compiler Options Explained

### Strict Mode Settings

| Option | Setting | Rationale |
|--------|---------|-----------|
| `strict` | ✅ true | Enables fundamental type safety |
| `strictNullChecks` | ✅ true | Prevents null/undefined errors |
| `noImplicitAny` | ✅ true | Requires explicit types for unclear values |
| `noUncheckedIndexedAccess` | ✅ true | Safer array/object access |
| `useUnknownInCatchVariables` | ✅ true | Catch blocks use `unknown` not `any` |
| `exactOptionalPropertyTypes` | ❌ false | Too restrictive with libraries |
| `strictPropertyInitialization` | ❌ false | Issues with decorators/ORMs |
| `noUnusedLocals` | ❌ false | Annoying during development |
| `noUnusedParameters` | ❌ false | Annoying during development |

### Module Settings

| Config | Module | Resolution | Why |
|--------|--------|------------|-----|
| base | ESNext | bundler | Modern bundlers handle ESM |
| node | CommonJS | node | Node.js compatibility |
| nextjs | ESNext | bundler | Next.js handles modules |
| library | ESNext | bundler | For modern consumers |

### Build Performance

All configs include:
- `skipLibCheck: true` - Skip type checking `.d.ts` files
- `incremental: true` - Reuse build information
- `isolatedModules: true` - Enables faster transpilation

## Migration Guide

### Switching from JavaScript to TypeScript

1. Change file extensions from `.js` to `.ts`
2. Use `node.json` or `nextjs.json` (they allow JS)
3. Gradually add types as needed

### Moving from Loose to Strict

1. Start with `base.json`
2. Fix errors incrementally:
   - Add missing types for `any` values
   - Handle null/undefined cases
   - Add array bounds checking

### CommonJS to ESM

1. Switch from `node.json` to `base.json`
2. Change `require()` to `import`
3. Update `module.exports` to `export`

## Troubleshooting

### "Cannot find module" errors

- Check `moduleResolution` matches your environment
- Ensure `paths` mapping is correct for aliases
- Verify package.json `exports` field

### "Object is possibly undefined"

- From `noUncheckedIndexedAccess`
- Use optional chaining: `array[0]?.property`
- Or add bounds check: `if (array[0]) { ... }`

### Build performance issues

- Ensure `skipLibCheck` is true
- Check `include/exclude` patterns
- Use `incremental` compilation

### Type errors in node_modules

- Verify `skipLibCheck: true`
- May need to add `@types/*` packages
- Check for version mismatches

## Best Practices

1. **Don't override strict settings** - They're balanced for a reason
2. **Use the right config** - Node.js apps need CommonJS
3. **Keep configs minimal** - Only override what's necessary
4. **Commit tsconfig.json** - It's part of your package's API

## Contributing

To modify these configurations:

1. Consider impact across all packages
2. Test changes in multiple package types
3. Document rationale for changes
4. Update this README

Remember: These configs serve the entire monorepo. Changes affect all packages, so modifications should benefit the majority use case.