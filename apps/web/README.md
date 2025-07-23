# TicketsBot Web Dashboard

Modern web dashboard for TicketsBot - a Discord support ticket management system.

## Features

- **Discord OAuth Authentication** - Secure login with Discord
- **Server Management** - View and manage multiple Discord servers
- **Ticket Dashboard** - View, filter, and manage support tickets
- **Panel Configuration** - Create and customize ticket panels
- **Team Management** - Assign roles and permissions
- **Real-time Updates** - Live ticket status updates

## Tech Stack

- **Next.js 15.4** - React framework with Pages Router
- **React 19.1** - Latest React with concurrent features
- **TypeScript 5.8** - Type-safe development
- **TanStack Query v5** - Server state management
- **Zustand v5** - Client state management
- **shadcn/ui** - Modern UI components built on Radix UI
- **Tailwind CSS v4** - Utility-first styling
- **React Hook Form** - Form handling with Zod validation

## Architecture

### State Management

The dashboard uses a **Single Global Store Pattern** with:

- **Global App Store** (Zustand) - All UI state in `shared/stores/app-store.ts`
- **Feature Hooks** - Combine UI state with server queries
- **Atomic Selectors** - Prevent unnecessary re-renders
- **Server State** (TanStack Query) - API data caching and synchronization

### Feature Organization

```
features/
├── tickets/      # Ticket management
├── panels/       # Panel configuration
├── settings/     # Guild settings
├── permissions/  # Permission checking
└── user/         # User context
```

## Development

### Prerequisites

- Node.js 22+
- pnpm package manager
- Running API server (default port 9001)
- PostgreSQL database
- Redis (optional, for caching)

### Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start
```

### Environment Variables

The app validates environment variables using Zod in `env.ts`:

- `NEXT_PUBLIC_API_URL` - API server URL (e.g., http://localhost:9001)
- `NEXT_PUBLIC_APP_URL` - Dashboard URL (e.g., http://localhost:9000)
- `NEXT_PUBLIC_DOMAIN` - Domain for production
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` - Analytics domain (optional)
- `NEXT_PUBLIC_PLAUSIBLE_ENABLED` - Enable analytics (optional)

Note: Discord OAuth credentials are handled by the API server.

## Key Pages

- `/` - Dashboard home with server selection
- `/tickets` - Ticket management interface
- `/panels` - Panel creation and management
- `/settings` - Guild configuration
- `/blacklist` - Member blacklist management

## Testing

The dashboard uses Vitest for unit testing:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

For E2E testing, run the full stack locally and test user flows manually.

## Contributing

1. Follow the established patterns in `features/`
2. Use the global app store with atomic selectors
3. Create feature-specific hooks for combining UI and server state
4. Add proper TypeScript types and Zod schemas
5. Test your changes with the development server
