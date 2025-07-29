# Discord Integration Context

## Overview

The Discord integration provides a functional namespace for interacting with Discord's API. It offers pure API operations for panels, channels, messages, and permissions without any event handling.

## Architecture

### Core Module (`index.ts`)

The main Discord namespace provides:

1. **Client Management**
   - Singleton Discord.js client with automatic initialization
   - Connection management with retry logic
   - Graceful shutdown handling

2. **Panel Operations**
   - `deployPanel()` - Deploy support panels to Discord channels
   - `updatePanel()` - Update existing panel messages
   - `deletePanel()` - Remove panel messages

3. **Guild Operations**
   - `getGuildChannels()` - List available channels
   - `getGuildCategories()` - List channel categories
   - `getGuildRoles()` - List available roles
   - `getBotPermissions()` - Check bot permissions
   - `isValidTextChannel()` - Check if a channel exists and is text-based

4. **Channel Operations**
   - `createTicketChannel()` - Create text channels or threads
   - `deleteTicketChannel()` - Delete channels
   - `sendMessage()` - Send messages to channels

### Ticket Operations (`ticket-operations.ts`)

Provides helper functions for ticket-specific Discord operations:

1. **Ticket Management**
   - `createTicketFromPanel()` - Create ticket channel and database record
   - `closeTicket()` - Close ticket and optionally delete channel
   - `sendTicketMessage()` - Send messages to ticket channels
   - `updateTicketPermissions()` - Manage channel permissions

2. **Key Features**
   - Automatic transcript storage for system messages
   - Dynamic domain imports to avoid circular dependencies
   - Integration with TicketLifecycle domain for business logic

## Operation Flow

### Ticket Creation

1. API/Bot calls `createTicketFromPanel()`
2. Function creates Discord channel (text or thread)
3. `TicketLifecycle.create()` records ticket in database
4. Returns ticket ID and channel ID
5. Bot sends welcome message (handled in bot listeners)

### Message Sending

1. API/Bot calls `sendTicketMessage()`
2. Message sent to Discord channel
3. System messages automatically stored in transcript
4. Returns message ID

### Ticket Closure

1. API/Bot calls `closeTicket()`
2. `TicketLifecycle.close()` updates database
3. Channel optionally deleted
4. Bot handles notifications (in bot listeners)

## Usage Examples

### Create Ticket from Panel

```typescript
const { ticketId, channelId } = await createTicketFromPanel({
  guildId: interaction.guildId,
  userId: interaction.user.id,
  panelId: panel.id,
  subject: "Need help with billing",
  categoryId: "123456789",
  useThreads: false,
});
```

### Close Ticket

```typescript
await closeTicket({
  ticketId: 123,
  closedById: interaction.user.id,
  reason: "Issue resolved",
  deleteChannel: true,
});
```

### Send System Message

```typescript
await sendTicketMessage(ticketId, {
  content: "This ticket will be closed in 5 minutes due to inactivity.",
  embeds: [
    {
      title: "Inactivity Warning",
      color: 0xff9900,
    },
  ],
});
```

## Important Notes

1. **Circular Dependencies**: Domains are imported dynamically in ticket-operations.ts to avoid circular dependencies

2. **Error Handling**: All event handlers have try-catch blocks to prevent crashes

3. **Channel Patterns**: Default implementation identifies ticket channels by name prefix (`ticket-`)

4. **Permissions**: Bot requires these Discord permissions:
   - View Channel
   - Send Messages
   - Embed Links
   - Manage Channels (for creation/deletion)
   - Manage Threads (if using threads)

5. **No Event Handling**: All Discord events are handled exclusively in the bot application
