# ScheduledTask Domain

## Purpose

Manages background job scheduling and processing using BullMQ with Redis. This domain handles all asynchronous, time-delayed operations in TicketsBot.

## Architecture

- **BullMQ** for job queue management
- **Redis** as the backing store
- **Graceful degradation** when Redis unavailable
- **Type-safe job definitions**

## Key Components

### Main Domain (`index.ts`)
- `initialize()` - Set up queues and workers
- `shutdown()` - Graceful shutdown
- `scheduleAutoClose()` - Schedule ticket auto-closure
- `cancelAutoClose()` - Cancel scheduled job
- `cleanupOrphanedJobs()` - Remove orphaned jobs

### Queues (`queues/`)
- `ticket-lifecycle` - Handles ticket-related scheduled tasks

### Workers (`workers/`)
- `ticket-lifecycle` - Processes auto-close jobs

## Usage

```typescript
// Initialize on startup
await ScheduledTask.initialize();

// Schedule auto-close
const jobId = await ScheduledTask.scheduleAutoClose(ticketId, delayHours);

// Cancel if needed
await ScheduledTask.cancelAutoClose(jobId);

// Cleanup on startup
await ScheduledTask.cleanupOrphanedJobs();

// Shutdown gracefully
await ScheduledTask.shutdown();
```

## Job Types

### Auto-Close Job
- **Name**: `auto-close`
- **Data**: `{ ticketId: number }`
- **Behavior**: Closes ticket if still open with close request
- **Retry**: 3 attempts with exponential backoff

## Error Handling

- Jobs retry automatically on failure
- Failed jobs are kept for 7 days for debugging
- Graceful degradation when Redis unavailable
- All operations return null/false when disabled

## Future Extensions

This domain can be extended with:
- Scheduled reminders
- Periodic cleanup tasks
- Analytics aggregation
- Export job processing