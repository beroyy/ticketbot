# Web Dashboard Application

## Architecture Overview

Next.js 15 dashboard using pages router with:

- **Feature-based organization** in `features/` directory
- **Single global Zustand store** with atomic selectors
- **TanStack Query v5** for server state management
- **shadcn/ui components** with Tailwind CSS
- **React Hook Form** with Zod validation

## State Management Patterns

### Global App Store

The application uses a single global Zustand store (`shared/stores/app-store.ts`) that manages all UI state:

```typescript
interface AppStore {
  // Global UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Feature-specific state sections
  tickets: TicketUIState;
  panels: PanelUIState;
  // ... other features
}
```

### Feature Hooks Pattern

Each feature exposes hooks that combine server and UI state:

```typescript
// features/tickets/hooks/use-ticket-queries.ts
export function useTicketQueries() {
  const filters = useAppStore((state) => state.tickets.filters);

  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => api.getTickets(filters),
    staleTime: 30 * 1000,
  });
}
```

### Atomic Selectors Pattern

Use atomic selectors from the global store to prevent unnecessary re-renders:

```typescript
// Atomic selectors from app store
export const useTicketFilters = () => useAppStore((state) => state.tickets.filters);

export const useTicketView = () => useAppStore((state) => state.tickets.view);

export const useSelectedGuildId = () => useAppStore((state) => state.selectedGuildId);

// Usage in components
function TicketList() {
  const filters = useTicketFilters(); // Only re-renders on filter changes
  const { data } = useTicketQueries();
  // ...
}
```

### Query and Mutation Patterns

**Queries** - Define in `features/[feature]/queries.ts`:

```typescript
export const ticketQueries = {
  list: (guildId: string, filters?: TicketFilters) => ({
    queryKey: ["tickets", guildId, filters],
    queryFn: () => api.getTickets({ guildId, ...filters }),
    staleTime: 30 * 1000,
  }),

  detail: (ticketId: string) => ({
    queryKey: ["tickets", "detail", ticketId],
    queryFn: () => api.getTicket(ticketId),
  }),
};
```

**Mutations** - Use dedicated hooks:

```typescript
// features/tickets/hooks/use-ticket-mutations.ts
export function useCloseTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, reason }: CloseTicketParams) => api.closeTicket(ticketId, reason),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({
        queryKey: ["tickets"],
      });
      toast.success("Ticket closed successfully");
    },
  });
}
```

## Feature Structure

```
features/
├── tickets/
│   ├── hooks/          # Query, mutation, and UI hooks
│   │   ├── use-ticket-queries.ts
│   │   ├── use-ticket-mutations.ts
│   │   └── use-ticket-ui-state.ts
│   ├── queries.ts      # Query key factories
│   ├── types/          # TypeScript interfaces
│   ├── ui/             # Feature components
│   └── utils/          # Helper functions
├── panels/
│   ├── schemas/        # Zod validation schemas
│   └── ui/
│       └── panel-wizard-v2/  # Multi-step form
├── settings/
├── permissions/
└── user/
    └── stores/         # Only feature with local store
```

**Note**: Most features use the global app store. Only the user feature has a separate store for user preferences.

## Component Patterns

### Page Component

```typescript
// pages/tickets.tsx
export default function TicketsPage() {
  const selectedGuildId = useSelectedGuildId();
  const { data, isLoading, error } = useTicketQueries();
  const filters = useTicketFilters();
  const setFilters = useAppStore((state) => state.setTicketFilters);

  if (!selectedGuildId) return <SelectServerModal />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="container mx-auto p-6">
      <TicketFilters
        filters={filters}
        onFiltersChange={setFilters}
      />
      <DataTable
        columns={ticketColumns}
        data={data.tickets}
      />
    </div>
  );
}
```

### Permission Guard

```typescript
// components/permission-guard.tsx usage
<PermissionGuard
  permissions={PermissionFlags.PANEL_CREATE}
  fallback={<div>You don't have permission to create panels</div>}
>
  <CreatePanelButton />
</PermissionGuard>

// Or use the hook directly
function AdminSection() {
  const { hasPermission } = usePermissions();

  if (!hasPermission(PermissionFlags.GUILD_SETTINGS_EDIT)) {
    return null;
  }

  return <AdminSettings />;
}
```

## Development

### Running

```bash
# Development
pnpm dev

# Production build
pnpm build && pnpm start
```

### Adding Features

1. Create feature folder in `features/`
2. Set up:
   - `stores/` - UI state
   - `queries.ts` - Server queries
   - `hooks/` - Controller hook
   - `ui/` - Components
3. Use controller hook in page component

### API Integration

The `lib/api.ts` client handles:

- Authentication headers
- Error transformation
- Type safety with Zod schemas

## Testing

### Unit Tests

Use Vitest for testing components and hooks:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

### E2E Testing

For end-to-end testing, run the full stack locally and test user flows:

```bash
# Start all services
pnpm start:docker

# Web app runs on http://localhost:9000
```

### Testing Patterns

1. **Component Testing**: Test UI components in isolation
2. **Hook Testing**: Use `@testing-library/react-hooks`
3. **Integration Testing**: Test feature flows with mocked API
4. **Accessibility**: Ensure ARIA labels and keyboard navigation

## Form Handling

The app uses React Hook Form with Zod validation:

```typescript
// features/panels/schemas/panel-form-schema.ts
const PanelFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  channelId: z.string(),
  // ...
});

// Usage in component
function PanelForm() {
  const form = useForm<PanelFormData>({
    resolver: zodResolver(PanelFormSchema),
    defaultValues: { /* ... */ },
  });

  const createPanel = useCreatePanel();

  const onSubmit = (data: PanelFormData) => {
    createPanel.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

## Environment Configuration

The app uses a typed environment configuration:

```typescript
// env.ts
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  // ... other vars
});

export const env = envSchema.parse(process.env);
```

## Key Dependencies

- `next` ^15.4.2 - React framework (pages router)
- `react` ^19.1.0 - React library
- `@tanstack/react-query` ^5.83.0 - Server state management
- `zustand` ^5.0.6 - Client state management
- `react-hook-form` ^7.60.0 - Form handling
- `zod` ^4.0.5 - Schema validation
- **Note**: Review `docs/zod-v4.md` for Zod v4 migration guide
- `@ticketsbot/core` - Shared types and business logic
- `@ticketsbot/auth/client` - Authentication client
- `radix-ui` latest - Headless UI components
- `tailwindcss` ^4.1.11 - Utility-first CSS

## Layout Shift Prevention Tactics

When building new UI components, follow these tactics to minimize Cumulative Layout Shift (CLS):

### Component Structure
- **Reserve space for dynamic content** - Set explicit dimensions (height/width) for containers that will load content
- **Use skeleton loaders** - Match exact dimensions of final content, not generic placeholders
- **Implement stable components** - Create wrapper components for images/avatars with fixed dimensions
- **Avoid conditional mounting** - Use opacity/visibility transitions instead of mounting/unmounting elements

### Loading States
- **Create matching skeletons** - Skeleton should have identical layout structure as loaded content
- **Set minimum heights** - Use `min-h-*` for containers that may have variable content
- **Reserve space for scrollbars** - Apply `scrollbar-gutter: stable` to prevent shifts when content overflows
- **Lazy load heavy components** - Use `dynamic()` imports with proper loading states for charts/visualizations

### Images and Media
- **Use Next.js Image with fill** - Prefer `fill` prop with container dimensions over width/height
- **Add aspect ratios** - Use `aspect-ratio` CSS or Tailwind's aspect utilities
- **Implement image placeholders** - Show colored background or blur placeholder while loading
- **Preload critical images** - Add `priority` prop for above-the-fold images

### Typography and Fonts
- **Configure font display** - Use `display: 'swap'` in font configuration
- **Define fallback fonts** - Specify system fonts that match metrics
- **Use `adjustFontFallback`** - Enable Next.js font metric matching
- **Avoid FOUT/FOIT** - Preload critical font weights in _document.tsx

### Layout Stability
- **Fixed navbar height** - Maintain consistent height across all states
- **Stable button dimensions** - Set min-width/height for interactive elements
- **Use CSS Grid for layouts** - More predictable than flexbox for complex layouts
- **Apply `contain: layout`** - Use CSS containment for independent components

### Animation and Transitions
- **Animate transform/opacity only** - Avoid animating properties that trigger layout
- **Use CSS transitions** - Prefer CSS over JavaScript for simple state changes
- **Add will-change sparingly** - Only for elements that definitely animate
- **Implement fade transitions** - Use opacity for showing/hiding instead of display changes

### Performance Monitoring
- **Track Web Vitals** - Monitor CLS scores in development and production
- **Test on slow connections** - Use Chrome DevTools network throttling
- **Verify with Lighthouse** - Target CLS score < 0.1
- **Add performance marks** - Measure critical loading phases

# Tailwind CSS Rules and Best Practices

## Core Principles

- **Always use Tailwind CSS v4.1+** - Ensure the codebase is using the latest version
- **Do not use deprecated or removed utilities** - ALWAYS use the replacement
- **Never use `@apply`** - Use CSS variables, the `--spacing()` function, or framework components instead
- **Check for redundant classes** - Remove any classes that aren't necessary
- **Group elements logically** to simplify responsive tweaks later

## Upgrading to Tailwind CSS v4

### Before Upgrading

- **Always read the upgrade documentation first** - Read https://tailwindcss.com/docs/upgrade-guide and https://tailwindcss.com/blog/tailwindcss-v4 before starting an upgrade.
- Ensure the git repository is in a clean state before starting

### Upgrade Process

1. Run the upgrade command: `npx @tailwindcss/upgrade@latest` for both major and minor updates
2. The tool will convert JavaScript config files to the new CSS format
3. Review all changes extensively to clean up any false positives
4. Test thoroughly across your application

## Breaking Changes Reference

### Removed Utilities (NEVER use these in v4)

| ❌ Deprecated           | ✅ Replacement                                    |
| ----------------------- | ------------------------------------------------- |
| `bg-opacity-*`          | Use opacity modifiers like `bg-black/50`          |
| `text-opacity-*`        | Use opacity modifiers like `text-black/50`        |
| `border-opacity-*`      | Use opacity modifiers like `border-black/50`      |
| `divide-opacity-*`      | Use opacity modifiers like `divide-black/50`      |
| `ring-opacity-*`        | Use opacity modifiers like `ring-black/50`        |
| `placeholder-opacity-*` | Use opacity modifiers like `placeholder-black/50` |
| `flex-shrink-*`         | `shrink-*`                                        |
| `flex-grow-*`           | `grow-*`                                          |
| `overflow-ellipsis`     | `text-ellipsis`                                   |
| `decoration-slice`      | `box-decoration-slice`                            |
| `decoration-clone`      | `box-decoration-clone`                            |

### Renamed Utilities (ALWAYS use the v4 name)

| ❌ v3              | ✅ v4              |
| ------------------ | ------------------ |
| `bg-gradient-*`    | `bg-linear-*`      |
| `shadow-sm`        | `shadow-xs`        |
| `shadow`           | `shadow-sm`        |
| `drop-shadow-sm`   | `drop-shadow-xs`   |
| `drop-shadow`      | `drop-shadow-sm`   |
| `blur-sm`          | `blur-xs`          |
| `blur`             | `blur-sm`          |
| `backdrop-blur-sm` | `backdrop-blur-xs` |
| `backdrop-blur`    | `backdrop-blur-sm` |
| `rounded-sm`       | `rounded-xs`       |
| `rounded`          | `rounded-sm`       |
| `outline-none`     | `outline-hidden`   |
| `ring`             | `ring-3`           |

## Layout and Spacing Rules

### Flexbox and Grid Spacing

#### Always use gap utilities for internal spacing

Gap provides consistent spacing without edge cases (no extra space on last items). It's cleaner and more maintainable than margins on children.

```html
<!-- ❌ Don't do this -->
<div class="flex">
  <div class="mr-4">Item 1</div>
  <div class="mr-4">Item 2</div>
  <div>Item 3</div>
  <!-- No margin on last -->
</div>

<!-- ✅ Do this instead -->
<div class="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

#### Gap vs Space utilities

- **Never use `space-x-*` or `space-y-*` in flex/grid layouts** - always use gap
- Space utilities add margins to children and have issues with wrapped items
- Gap works correctly with flex-wrap and all flex directions

```html
<!-- ❌ Avoid space utilities in flex containers -->
<div class="flex flex-wrap space-x-4">
  <!-- Space utilities break with wrapped items -->
</div>

<!-- ✅ Use gap for consistent spacing -->
<div class="flex flex-wrap gap-4">
  <!-- Gap works perfectly with wrapping -->
</div>
```

### General Spacing Guidelines

- **Prefer top and left margins** over bottom and right margins (unless conditionally rendered)
- **Use padding on parent containers** instead of bottom margins on the last child
- **Always use `min-h-dvh` instead of `min-h-screen`** - `min-h-screen` is buggy on mobile Safari
- **Prefer `size-*` utilities** over separate `w-*` and `h-*` when setting equal dimensions
- For max-widths, prefer the container scale (e.g., `max-w-2xs` over `max-w-72`)

## Typography Rules

### Line Heights

- **Never use `leading-*` classes** - Always use line height modifiers with text size
- **Always use fixed line heights from the spacing scale** - Don't use named values

```html
<!-- ❌ Don't do this -->
<p class="text-base leading-7">Text with separate line height</p>
<p class="text-lg leading-relaxed">Text with named line height</p>

<!-- ✅ Do this instead -->
<p class="text-base/7">Text with line height modifier</p>
<p class="text-lg/8">Text with specific line height</p>
```

### Font Size Reference

Be precise with font sizes - know the actual pixel values:

- `text-xs` = 12px
- `text-sm` = 14px
- `text-base` = 16px
- `text-lg` = 18px
- `text-xl` = 20px

## Color and Opacity

### Opacity Modifiers

**Never use `bg-opacity-*`, `text-opacity-*`, etc.** - use the opacity modifier syntax:

```html
<!-- ❌ Don't do this -->
<div class="bg-red-500 bg-opacity-60">Old opacity syntax</div>

<!-- ✅ Do this instead -->
<div class="bg-red-500/60">Modern opacity syntax</div>
```

## Responsive Design

### Breakpoint Optimization

- **Check for redundant classes across breakpoints**
- **Only add breakpoint variants when values change**

```html
<!-- ❌ Redundant breakpoint classes -->
<div class="px-4 md:px-4 lg:px-4">
  <!-- md:px-4 and lg:px-4 are redundant -->
</div>

<!-- ✅ Efficient breakpoint usage -->
<div class="px-4 lg:px-8">
  <!-- Only specify when value changes -->
</div>
```

## Dark Mode

### Dark Mode Best Practices

- Use the plain `dark:` variant pattern
- Put light mode styles first, then dark mode styles
- Ensure `dark:` variant comes before other variants

```html
<!-- ✅ Correct dark mode pattern -->
<div class="bg-white text-black dark:bg-black dark:text-white">
  <button class="hover:bg-gray-100 dark:hover:bg-gray-800">Click me</button>
</div>
```

## Gradient Utilities

- **ALWAYS Use `bg-linear-*` instead of `bg-gradient-*` utilities** - The gradient utilities were renamed in v4
- Use the new `bg-radial` or `bg-radial-[<position>]` to create radial gradients
- Use the new `bg-conic` or `bg-conic-*` to create conic gradients

```html
<!-- ✅ Use the new gradient utilities -->
<div class="bg-linear-to-br h-14 from-violet-500 to-fuchsia-500"></div>
<div class="size-18 bg-radial-[at_50%_75%] from-sky-200 via-blue-400 to-indigo-900 to-90%"></div>
<div class="bg-conic-180 size-24 from-indigo-600 via-indigo-50 to-indigo-600"></div>

<!-- ❌ Do not use bg-gradient-* utilities -->
<div class="h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500"></div>
```

## Working with CSS Variables

### Accessing Theme Values

Tailwind CSS v4 exposes all theme values as CSS variables:

```css
/* Access colors, and other theme values */
.custom-element {
  background: var(--color-red-500);
  border-radius: var(--radius-lg);
}
```

### The `--spacing()` Function

Use the dedicated `--spacing()` function for spacing calculations:

```css
.custom-class {
  margin-top: calc(100vh - --spacing(16));
}
```

### Extending theme values

Use CSS to extend theme values:

```css
@import "tailwindcss";

@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```

```html
<div class="bg-mint-500">
  <!-- ... -->
</div>
```

## New v4 Features

### Container Queries

Use the `@container` class and size variants:

```html
<article class="@container">
  <div class="@md:flex-row @lg:gap-8 flex flex-col">
    <img class="@md:w-48 w-full" />
    <div class="@md:mt-0 mt-4">
      <!-- Content adapts to container size -->
    </div>
  </div>
</article>
```

### Container Query Units

Use container-based units like `cqw` for responsive sizing:

```html
<div class="@container">
  <h1 class="text-[50cqw]">Responsive to container width</h1>
</div>
```

### Text Shadows (v4.1)

Use text-shadow-\* utilities from text-shadow-2xs to text-shadow-lg:

```html
<!-- ✅ Text shadow examples -->
<h1 class="text-shadow-lg">Large shadow</h1>
<p class="text-shadow-sm/50">Small shadow with opacity</p>
```

### Masking (v4.1)

Use the new composable mask utilities for image and gradient masks:

```html
<!-- ✅ Linear gradient masks on specific sides -->
<div class="mask-t-from-50%">Top fade</div>
<div class="mask-b-from-20% mask-b-to-80%">Bottom gradient</div>
<div class="mask-linear-from-white mask-linear-to-black/60">Fade from white to black</div>

<!-- ✅ Radial gradient masks -->
<div class="mask-radial-[100%_100%] mask-radial-from-75% mask-radial-at-left">Radial mask</div>
```

## Component Patterns

### Avoiding Utility Inheritance

Don't add utilities to parents that you override in children:

```html
<!-- ❌ Avoid this pattern -->
<div class="text-center">
  <h1>Centered Heading</h1>
  <div class="text-left">Left-aligned content</div>
</div>

<!-- ✅ Better approach -->
<div>
  <h1 class="text-center">Centered Heading</h1>
  <div>Left-aligned content</div>
</div>
```

### Component Extraction

- Extract repeated patterns into framework components, not CSS classes
- Keep utility classes in templates/JSX
- Use data attributes for complex state-based styling

## CSS Best Practices

### Nesting Guidelines

- Use nesting when styling both parent and children
- Avoid empty parent selectors

```css
/* ✅ Good nesting - parent has styles */
.card {
  padding: --spacing(4);

  > .card-title {
    font-weight: bold;
  }
}

/* ❌ Avoid empty parents */
ul {
  > li {
    /* Parent has no styles */
  }
}
```

## Common Pitfalls to Avoid

1. **Using old opacity utilities** - Always use `/opacity` syntax like `bg-red-500/60`
2. **Redundant breakpoint classes** - Only specify changes
3. **Space utilities in flex/grid** - Always use gap
4. **Leading utilities** - Use line-height modifiers like `text-sm/6`
5. **Arbitrary values** - Use the design scale
6. **@apply directive** - Use components or CSS variables
7. **min-h-screen on mobile** - Use min-h-dvh
8. **Separate width/height** - Use size utilities when equal
9. **Arbitrary values** - Always use Tailwind's predefined scale whenever possible (e.g., use `ml-4` over `ml-[16px]`)
