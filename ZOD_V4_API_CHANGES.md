# Zod v4 API Changes Guide

## Executive Summary

Zod v4 is a major release focusing on performance (up to 14x faster), developer experience, and API consistency. This guide documents all breaking changes and new features for agents working with Zod v4.

**Key Highlights:**
- 🚀 14x faster string parsing, 7x faster arrays, 6.5x faster objects
- 📦 57% smaller core bundle size
- 🔧 Unified error customization with `error` property
- 🌲 Tree-shakable top-level string validators
- 🆕 Native JSON Schema conversion, file validation, template literals

## Breaking Changes

### 1. Error Customization: `message` → `error`

The most significant breaking change is the replacement of `message` with `error`:

```typescript
// ❌ Zod v3 (deprecated)
z.string().min(5, { message: "Too short" });

// ✅ Zod v4
z.string().min(5, { error: "Too short" });
```

### 2. Unified Error Parameters

`invalid_type_error` and `required_error` are replaced with a single `error` function:

```typescript
// ❌ Zod v3
z.string({
  required_error: "This field is required",
  invalid_type_error: "Not a string",
});

// ✅ Zod v4
z.string({
  error: (issue) => {
    if (issue.input === undefined) {
      return "This field is required";
    }
    return "Not a string";
  }
});
```

### 3. String Formats → Top-Level Functions

All string format methods are deprecated in favor of top-level functions:

```typescript
// ❌ Deprecated (will be removed in v5)
z.string().email()
z.string().uuid()
z.string().url()
z.string().datetime()
z.string().ip()

// ✅ Use top-level functions
z.email()
z.uuid()
z.url()
z.iso.datetime()
z.ipv4() // or z.ipv6()
```

**Complete list of top-level validators:**
- `z.email()`, `z.uuid()`, `z.url()`, `z.emoji()`
- `z.base64()`, `z.base64url()`, `z.jwt()`
- `z.nanoid()`, `z.cuid()`, `z.cuid2()`, `z.ulid()`
- `z.ipv4()`, `z.ipv6()`, `z.cidrv4()`, `z.cidrv6()`
- `z.iso.date()`, `z.iso.time()`, `z.iso.datetime()`, `z.iso.duration()`
- `z.ascii()`, `z.utf8()`, `z.lowercase()`, `z.uppercase()`

### 4. Object Schema Changes

```typescript
// ❌ Deprecated methods
schema.strict()
schema.passthrough()
schema.strip()
schema.deepPartial()

// ✅ Use these instead
// strict is now the default behavior
// use z.object().passthrough() for passthrough behavior
// strip() is no longer needed
// use recursive types for deep partial
```

### 5. Number Validation Changes

- No infinite values by default
- Stricter `.safe()` validation
- `.int()` no longer accepts floats that happen to be integers

```typescript
// ❌ This now fails
z.number().parse(Infinity);
z.number().int().parse(5.0); // was ok in v3

// ✅ Be explicit
z.number().finite(); // excludes Infinity
z.number().int(); // only true integers
```

### 6. Coercion Type Changes

```typescript
// v3: input type was the same as the schema
// v4: input type is now 'unknown'

const schema = z.coerce.number();
// v3: (input: number) => number
// v4: (input: unknown) => number
```

## New Features

### 1. Native JSON Schema Conversion

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number().min(0),
});

// Convert to JSON Schema
const jsonSchema = z.toJSONSchema(schema);
// Result: { type: 'object', properties: { ... }, required: [...] }
```

### 2. File Validation

```typescript
const fileSchema = z.file()
  .min(1000)           // minimum size in bytes
  .max(5_000_000)      // maximum size in bytes
  .type("image/png");  // MIME type validation

// For multiple types
z.file().type(["image/png", "image/jpeg"]);
```

### 3. Template Literals

```typescript
// Simple template
z.templateLiteral(["Hello, ", z.string()]); 
// Type: `Hello, ${string}`

// Complex templates
z.templateLiteral([
  z.number(), 
  z.enum(["px", "em", "rem"])
]); 
// Type: `${number}px` | `${number}em` | `${number}rem`
```

### 4. Error Pretty Printing

```typescript
const result = schema.safeParse(invalidData);
if (!result.success) {
  console.log(z.prettifyError(result.error));
  // Outputs formatted, readable error messages
}
```

### 5. Global Registry

```typescript
// Register common metadata
z.globalRegistry.register("MySchema", {
  id: "user-schema",
  title: "User Schema",
  description: "Schema for user data",
  examples: [{ name: "John", age: 30 }]
});
```

### 6. Multiple Literal Values

```typescript
// v3: only single values
z.literal("apple");

// v4: multiple values supported
z.literal("apple", "banana", "orange");
```

### 7. Zod Mini (Tree-Shakable API)

```typescript
import { string, number, object } from "zod/mini";

const schema = object({
  name: string(),
  age: number()
});
```

## Performance Improvements

- **String parsing**: 14x faster
- **Array parsing**: 7x faster  
- **Object parsing**: 6.5x faster
- **TypeScript instantiations**: 100x reduction
- **Bundle size**: 57% smaller core

## Migration Quick Reference

| Zod v3 | Zod v4 |
|--------|--------|
| `{ message: "error" }` | `{ error: "error" }` |
| `z.string().email()` | `z.email()` |
| `z.string().uuid()` | `z.uuid()` |
| `z.string().url()` | `z.url()` |
| `z.string().datetime()` | `z.iso.datetime()` |
| `z.string().ip()` | `z.ipv4()` or `z.ipv6()` |
| `invalid_type_error` | Use `error` function |
| `required_error` | Use `error` function |
| `.deepPartial()` | Use recursive types |
| `.strip()` | Default behavior |
| `.strict()` | Default behavior |

## Important Notes

1. **Import Path**: Use `import { z } from "zod"` (not `"zod/v4"`)
2. **Deprecation Warnings**: Method-based string formats still work but will be removed in v5
3. **Error Messages**: Default error messages are more descriptive in v4
4. **Strict by Default**: Objects are strict by default (no unknown keys)
5. **UUID Validation**: Stricter RFC compliance; use `z.guid()` for lenient validation

## Code Migration Example

```typescript
// Complete v3 → v4 migration example

// ❌ Zod v3
const userSchema = z.object({
  email: z.string().email({ message: "Invalid email" }),
  age: z.number({
    required_error: "Age is required",
    invalid_type_error: "Age must be a number"
  }).positive(),
  website: z.string().url().optional(),
  id: z.string().uuid()
}).strict();

// ✅ Zod v4
const userSchema = z.object({
  email: z.email({ error: "Invalid email" }),
  age: z.number({
    error: (issue) => {
      if (issue.input === undefined) return "Age is required";
      return "Age must be a number";
    }
  }).positive(),
  website: z.url().optional(),
  id: z.uuid()
}); // strict by default
```

## Best Practices for v4

1. **Always use top-level validators** for strings (email, url, etc.)
2. **Use the unified `error` parameter** for custom messages
3. **Leverage tree-shaking** with specific imports when bundle size matters
4. **Use `z.file()` for file uploads** instead of custom validation
5. **Convert to JSON Schema** when integrating with OpenAPI/Swagger
6. **Use template literals** for pattern-based string types

This guide should be referenced when working with Zod schemas in this codebase to ensure v4 best practices are followed.