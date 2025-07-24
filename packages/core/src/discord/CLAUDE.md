# Discord Integration Context

## Overview

The Discord integration provides a functional namespace for interacting with Discord's API and handling ticket-related events. It bridges Discord operations with the new domain structure.

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

4. **Event Handling**
   - `registerHandlers()` - Register event handlers for ticket operations
   - Built-in listeners for `messageCreate` and `channelDelete` events
   - Handler types for ticket lifecycle events

### Ticket Operations (`ticket-operations.ts`)

Provides ticket-specific Discord operations:

1. **Event Handler Initialization**
   - `initializeTicketHandlers()` - Sets up all ticket event handlers
   - Automatically stores messages in transcripts
   - Handles ticket creation and closure

2. **Ticket Management**
   - `createTicketFromPanel()` - Create ticket from panel interaction
   - `closeTicket()` - Close ticket and optionally delete channel
   - `sendTicketMessage()` - Send and store messages in tickets
   - `updateTicketPermissions()` - Manage channel permissions

## Event Flow

### Ticket Creation

1. User clicks panel button/selects option
2. Bot creates Discord channel (text or thread)
3. `TicketLifecycle.create()` records ticket in database
4. Welcome message sent to channel
5. `onTicketCreate` handler triggered

### Message Handling

1. User sends message in ticket channel
2. `messageCreate` event fires
3. Handler checks if channel is ticket
4. Message stored via `Transcripts.storeMessage()`

### Ticket Closure

1. Staff closes ticket or channel deleted
2. `TicketLifecycle.close()` updates database
3. Channel optionally deleted
4. `onTicketClose` handler triggered

## Usage Examples

### Initialize Handlers

```typescript
import { initializeTicketHandlers } from "@ticketsbot/core/discord";

// Call during bot startup
initializeTicketHandlers();
```

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

5. **Event Registration**: Must call `initializeTicketHandlers()` during bot startup to enable ticket event handling
