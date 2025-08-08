# Discord Bot Application

## Architecture

The bot uses the Sapphire Framework with custom extensions for:

- **Automatic loading** of commands, listeners, and interaction handlers
- **Reusable preconditions** for permission checking
- **Context-aware domain integration** with automatic Discord actor context
- **Type-safe interactions** with Discord.js v14
- **Functional command patterns** alongside traditional class-based commands
- **Result-type error handling** for predictable error flows

### Directory Structure

```
src/
├── commands/                # Commands organized by category
│   ├── staff/              # Staff management commands
│   ├── tags/               # Tag system commands
│   └── tickets/            # Ticket operation commands
├── listeners/              # Event listeners
│   ├── domain-events/      # Domain event handlers
│   └── [discord events]    # Discord.js event handlers
├── preconditions/          # Reusable permission checks
├── interactions/           # Interaction handlers
│   ├── buttons/            # Button interaction handlers
│   ├── modals/             # Modal submission handlers
│   └── select-menus/       # Select menu handlers
└── lib/
    ├── sapphire-extensions/    # Custom Sapphire abstractions
    │   ├── base-bot-client.ts  # Extended SapphireClient
    │   ├── base-command.ts     # Context-aware base command
    │   ├── base-ticket-command.ts  # Ticket-specific base
    │   ├── command-factory.ts  # Functional command creation
    │   ├── interaction-factory.ts  # Handler factories
    │   ├── listener-factory.ts     # Event listener factories
    │   └── precondition-factory.ts # Precondition utilities
    ├── discord-operations/     # High-level Discord operations
    │   ├── channel.ts          # Channel management
    │   ├── feedback.ts         # Feedback collection
    │   ├── logging.ts          # Action logging
    │   ├── message.ts          # Message operations
    │   ├── panel.ts            # Panel deployment
    │   ├── roles.ts            # Role management
    │   ├── ticket.ts           # Ticket Discord operations
    │   └── transcript.ts       # Transcript generation
    └── discord-utils/          # Discord-specific utilities
        ├── embed-builder.ts    # Fluent embed creation
        ├── result.ts           # Result<T, E> type pattern
        ├── validation.ts       # Discord entity validation
        └── [other utils]       # Response helpers, colors, etc.
```

### Key Patterns

#### Command Patterns

The bot supports two command patterns:

**1. Class-Based Commands (Traditional)**

```typescript
export class OpenCommand extends BaseCommand {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "open",
      description: "Create a new support ticket",
      preconditions: ["GuildOnly"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    // Automatic context provided by BaseCommand
    const result = await Ticket.create({
      subject: "Support Request",
      guildId: interaction.guildId!,
      // ... other fields
    });
  }
}
```

**2. Factory Pattern (Functional)**

```typescript
export default createCommand({
  name: "stats",
  description: "View ticket statistics",
  preconditions: ["GuildOnly", "TeamOnly"],
  options: {
    user: {
      type: "user",
      description: "View stats for specific user",
      required: false,
    },
  },
  async execute(interaction, { user }) {
    // Context automatically provided
    const stats = await Analytics.getTicketStats({
      guildId: interaction.guildId!,
      userId: user?.id,
    });
    // ...
  },
});
```

#### Preconditions

- `AdminOnly` - Requires bot administrator
- `TeamOnly` - Requires support team member
- `TicketChannelOnly` - Must be in ticket channel
- `GuildOnly` - Must be in a guild
- `HasPermission` - Flexible permission checking
- `CanCloseTicket` - Complex ticket close logic

#### Interaction Handlers

Interaction handlers can use class-based or factory patterns:

**Button Handler Example**

```typescript
export default createButtonHandler({
  customId: "ticket_close",
  preconditions: ["TicketChannelOnly"],
  async execute(interaction) {
    const ticket = await getTicketFromChannel(interaction.channelId);
    if (!ticket) return error(interaction, "Ticket not found");

    // Show confirmation modal or close directly
    await interaction.showModal(closeReasonModal);
  },
});
```

**Modal Handler Example**

```typescript
export default createModalHandler({
  customId: "close_reason_modal",
  async execute(interaction) {
    const reason = interaction.fields.getTextInputValue("reason");
    const ticketId = interaction.customId.split(":")[1];

    const result = await Ticket.close(ticketId, { reason });

    if (result.success) {
      await success(interaction, "Ticket closed successfully");
    } else {
      await error(interaction, result.error);
    }
  },
});
```

## Context System Integration

### Automatic Context Provision

The bot deeply integrates with the AsyncLocalStorage context system:

```typescript
// BaseCommand automatically provides context for all commands
export abstract class BaseCommand extends Command {
  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    // Create Discord actor from interaction
    const actor = await createActorFromInteraction(interaction);

    // Run command with actor context
    return withActor(actor, async () => {
      await this.execute(interaction);
    });
  }

  protected abstract execute(interaction: Command.ChatInputCommandInteraction): Promise<void>;
}
```

### Permission Integration

```typescript
// Team permission checker provides permissions for context
export class TeamPermissionChecker implements PermissionProvider {
  async getPermissions(userId: string, guildId: string): Promise<bigint> {
    const member = await TeamMember.get({ userId, guildId });
    return member?.computedPermissions ?? 0n;
  }
}
```

### Domain Event Handling

```typescript
// Domain events are handled in listeners/domain-events/
export default createListener({
  event: "ticketCreated",
  async run(ticket: Ticket) {
    // Send notification to logs channel
    await logTicketCreated(ticket);
  },
});
```

## Architecture Highlights

### Discord Operations Layer

The `lib/discord-operations/` directory provides high-level Discord operations that encapsulate complex Discord.js interactions:

- **Channel Operations**: Creating tickets, managing permissions, archiving
- **Message Operations**: Sending embeds, handling attachments, pagination
- **Panel Deployment**: Creating and updating ticket panels with buttons/select menus
- **Role Management**: Syncing team roles with Discord roles
- **Transcript Generation**: Converting ticket history to readable transcripts

### Error Handling with Result Types

```typescript
// Result type for predictable error handling
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// Usage in commands
const result = await createTicketChannel(interaction.guild, ticket);
if (!result.success) {
  return error(interaction, result.error.message);
}

// Use the created channel
const channel = result.data;
```

### Health Check & Graceful Shutdown

```typescript
// Bot includes health check server
const server = app.listen(BOT_PORT, () => {
  console.log(`Health check on port ${BOT_PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await ScheduledTask.gracefulShutdown();
  server.close();
  client.destroy();
});
```

## Development

### Running the Bot

```bash
# Development with auto-reload
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Type checking
pnpm typecheck
```

### Environment Variables

```env
# Required
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# Optional
BOT_PORT=3002              # Health check port
NODE_ENV=development       # Environment
```

### Adding New Features

#### New Command

**Option 1: Class-based (for complex commands)**

1. Create file in appropriate `commands/` subfolder
2. Extend `BaseCommand` or `BaseTicketCommand`
3. Add preconditions as needed
4. Implement `execute()` method (context provided automatically)

**Option 2: Factory-based (for simple commands)**

1. Create file in appropriate `commands/` subfolder
2. Use `createCommand()` factory
3. Define options schema
4. Implement execute function

#### New Interaction Handler

1. Create handler in `interactions/[type]/`
2. Use appropriate factory:
   - `createButtonHandler()` for buttons
   - `createModalHandler()` for modals
   - `createSelectMenuHandler()` for select menus
3. Define customId pattern
4. Implement execute function

#### New Discord Operation

1. Add to appropriate file in `lib/discord-operations/`
2. Return `Result<T, Error>` for error handling
3. Handle all Discord.js errors internally
4. Provide clean API for commands to use

#### New Precondition

1. Create in `preconditions/`
2. Extend `Precondition`
3. Return `this.ok()` or `this.error()`
4. Use in commands via preconditions array

## Testing

### Command Testing

```typescript
// Commands are tested through their domain logic
// Mock the interaction and test the domain methods
const mockInteraction = createMockInteraction({
  guildId: "123",
  userId: "456",
  channelId: "789",
});

// Test domain logic separately
const result = await Ticket.create({
  guildId: mockInteraction.guildId,
  // ...
});
```

### Integration Testing

```bash
# Use the test token generator
tsx packages/scripts/src/test/generate-test-token.ts

# Test commands in development
pnpm dev
```

## Dependencies

### Core Dependencies

- `@sapphire/framework` - Command framework
- `@sapphire/plugin-logger` - Structured logging
- `discord.js` v14 - Discord API wrapper
- `@ticketsbot/core` - Domain logic and schemas
- **Important**: When using Zod, review `docs/zod-v4.md` for v4 API changes

### Utilities

- `ioredis` - Redis client for caching
- `colorette` - Terminal colors
- `@discordjs/builders` - Embed/component builders

## Common Issues

### "Missing Access" Errors

- Ensure bot has proper permissions in guild
- Check that slash commands are deployed
- Verify bot can see and send to channels

### Context Errors

- All domain operations must be called within command context
- Use `withActor()` for operations outside commands
- Check that BaseCommand is used, not raw Command

### Interaction Timeouts

- Defer replies for long operations: `await interaction.deferReply()`
- Follow up within 15 minutes: `await interaction.followUp()`
- Use ephemeral replies for errors: `{ ephemeral: true }`
