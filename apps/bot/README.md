# TicketsBot Discord Bot

A powerful Discord bot for customer support ticket management built with [Sapphire Framework](https://www.sapphirejs.dev/) and Discord.js v14.

## Overview

TicketsBot provides a complete support ticket system for Discord servers, featuring:

- 🎫 **Ticket Management** - Create, claim, close, and transfer support tickets
- 👥 **Team Roles** - Role-based permissions for support staff
- 🏷️ **Support Tags** - Quick response templates for common issues
- ⏰ **Auto-close** - Schedule tickets to close automatically
- 📝 **Transcripts** - Automatic conversation archival
- 📊 **Analytics** - Track support metrics and performance

## Architecture

The bot leverages modern patterns and technologies:

- **Sapphire Framework** - Structured Discord bot development with automatic loading
- **Domain-Driven Design** - Business logic in `@ticketsbot/core` domains
- **Context System** - AsyncLocalStorage-based permission and actor management
- **Factory Patterns** - Functional command and interaction creation
- **Result Types** - Predictable error handling without exceptions

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database
- Redis (optional, for scheduled tasks)
- Discord application with bot token

### Installation

```bash
# From monorepo root
pnpm install

# Navigate to bot directory
cd apps/bot

# Build the bot
pnpm build
```

### Environment Variables

Create a `.env` file in the monorepo root:

```env
# Required
NODE_ENV=development
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DATABASE_URL=postgresql://user:password@localhost:5432/ticketsbot

# Optional
REDIS_URL=redis://localhost:6379
BOT_PORT=3002
LOG_LEVEL=info
```

### Development

```bash
# Start development server with hot reload
pnpm dev

# Deploy slash commands to Discord
pnpm deploy

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run tests
pnpm test
```

## Command Structure

Commands are organized by category:

```
src/commands/
├── tickets/          # Ticket operations
│   ├── open.ts      # Create new ticket
│   ├── close.ts     # Close ticket
│   ├── claim.ts     # Claim ticket ownership
│   └── ...
├── staff/           # Team management
│   ├── addadmin.ts  # Add bot admin
│   ├── addsupport.ts # Add support member
│   └── ...
├── tags/            # Support tag management
└── [general]        # General commands
    ├── help.ts
    ├── stats.ts
    └── ...
```

### Creating Commands

**Factory Pattern (Recommended for simple commands):**

```typescript
import { createCommand } from "@bot/lib/sapphire-extensions";

export default createCommand({
  name: "ping",
  description: "Check bot latency",
  preconditions: ["GuildOnly"],
  async execute(interaction) {
    const ping = Math.round(interaction.client.ws.ping);
    await interaction.reply(`🏓 Pong! Latency: ${ping}ms`);
  },
});
```

**Class Pattern (For complex commands):**

```typescript
import { BaseCommand } from "@bot/lib/sapphire-extensions";

export class ComplexCommand extends BaseCommand {
  public constructor(context: Command.LoaderContext) {
    super(context, {
      name: "complex",
      description: "A complex command",
      preconditions: ["GuildOnly", "TeamOnly"],
    });
  }

  protected async execute(interaction: ChatInputCommandInteraction) {
    // Command logic with automatic context
    const result = await SomeDomain.performAction();
    // ...
  }
}
```

## Interaction Handlers

Handle buttons, modals, and select menus:

```typescript
// src/interactions/buttons/example-button.ts
import { createButtonHandler } from "@bot/lib/sapphire-extensions";

export default createButtonHandler({
  customId: /^example_button_(\d+)$/,
  async execute(interaction, [ticketId]) {
    // Handle button click
    await interaction.reply({
      content: `Processing ticket ${ticketId}`,
      ephemeral: true,
    });
  },
});
```

## Preconditions

Built-in preconditions for permission management:

- `GuildOnly` - Command must be used in a guild
- `TeamOnly` - User must be support team member
- `AdminOnly` - User must be bot administrator
- `TicketChannelOnly` - Must be in a ticket channel
- `HasPermission` - Check specific permissions
- `CanCloseTicket` - Complex ticket closing logic

## Domain Integration

The bot integrates with `@ticketsbot/core` domains:

```typescript
// Commands automatically provide context
import { Ticket } from "@ticketsbot/core/domains";

// Inside a command's execute method:
const ticket = await Ticket.create({
  subject: "Support Request",
  guildId: interaction.guildId!,
  authorId: interaction.user.id,
});

// Context is automatically provided by BaseCommand
```

## Deployment

### Docker

Build and run with Docker:

```bash
# Build image
docker build -f apps/bot/Dockerfile -t ticketsbot-bot .

# Run container
docker run -d \
  --name ticketsbot-bot \
  -p 3002:3002 \
  --env-file .env \
  ticketsbot-bot
```

### Health Check

The bot exposes a health endpoint at `http://localhost:3002/health`:

```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "version": "0.0.1"
}
```

### Production Considerations

1. **Database Migrations**: Run migrations before starting the bot
2. **Redis Connection**: Required for scheduled tasks (auto-close)
3. **Graceful Shutdown**: Bot handles SIGINT/SIGTERM signals
4. **Error Handling**: Unhandled rejections are logged but don't crash
5. **Command Deployment**: Deploy commands separately from bot start

## Key Features

### Ticket Lifecycle

1. **Creation**: Users open tickets via `/open` or panel buttons
2. **Assignment**: Support staff can claim tickets
3. **Communication**: Thread-based conversation in ticket channels
4. **Resolution**: Close with optional reason and feedback
5. **Archival**: Automatic transcript generation

### Permission System

Team members have granular permissions:

- View/claim/close tickets
- Manage team roles
- Deploy support panels
- View analytics
- Manage tags

### Scheduled Tasks

Auto-close tickets after specified duration:

```typescript
// Schedule auto-close in 24 hours
await Ticket.update(ticketId, {
  autoCloseAt: 24, // hours
});
```

## Troubleshooting

### Common Issues

**"Missing Access" Errors**

- Ensure bot has required permissions in guild
- Check channel permissions for ticket categories
- Verify slash commands are deployed

**Context Errors**

- All domain operations must be within command context
- Use `BaseCommand` or `BaseTicketCommand` for automatic context

**Interaction Timeouts**

- Defer long operations: `await interaction.deferReply()`
- Follow up within 15 minutes
- Use ephemeral replies for errors

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

## Contributing

1. Follow existing patterns for consistency
2. Use factory patterns for simple features
3. Add preconditions for permission checks
4. Test commands in development before deploying
5. Update documentation for new features

## Resources

- [Sapphire Documentation](https://www.sapphirejs.dev/)
- [Discord.js Guide](https://discordjs.guide/)
- [TicketsBot Core Domains](../core/README.md)
