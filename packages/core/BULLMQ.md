# BullMQ Implementation in TicketsBot

## Overview

This document details the BullMQ job queue implementation in TicketsBot for handling scheduled tasks. BullMQ provides a robust, Redis-backed job queue system that handles auto-close functionality and can be extended for other background tasks.

### Why BullMQ?

The initial design considered using PostgreSQL extensions for scheduling auto-close tasks. However, this approach had limitations:

- **Platform Compatibility**: Neon (our production PostgreSQL provider) doesn't support scheduling extensions
- **Portability**: Database-level scheduling ties the implementation to specific database features
- **Flexibility**: Limited job management capabilities
- **Monitoring**: Difficult to track job status and failures

BullMQ addresses these limitations by providing:

- Redis-backed persistence (already in our stack)
- Platform-agnostic implementation
- Rich job management features
- Built-in retry mechanisms
- Better observability

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ScheduledTask Domain                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Queues    │    │   Workers    │    │   Methods    │  │
│  ├─────────────┤    ├──────────────┤    ├──────────────┤  │
│  │  ticket-    │    │  ticket-     │    │ scheduleAuto │  │
│  │  lifecycle  │◄───┤  lifecycle   │    │    Close()   │  │
│  └─────────────┘    └──────────────┘    ├──────────────┤  │
│         │                   │            │ cancelAuto   │  │
│         │                   │            │   Close()    │  │
│         ▼                   ▼            └──────────────┘  │
│  ┌─────────────────────────────────┐                       │
│  │         Redis Storage           │                       │
│  └─────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### Dependencies

```json
{
  "dependencies": {
    "bullmq": "^5.34.0",
    "redis": "^5.6.0"
  }
}
```

### Environment Configuration

```env
# Redis connection (required for BullMQ)
REDIS_URL=redis://localhost:6379

# Optional: Override Redis host/port in Docker
REDIS_HOST=redis
REDIS_PORT=6379
```

### Redis Requirements

- Redis 6.2.0 or higher recommended
- Persistence enabled (AOF or RDB)
- Sufficient memory for job data
- Network accessibility from all services

## Domain Architecture

### Directory Structure

```
packages/core/src/domains/scheduled-task/
├── index.ts              # Main ScheduledTask domain
├── queues/
│   └── ticket-lifecycle.ts   # Queue configuration
├── workers/
│   └── ticket-lifecycle.ts   # Job processors
└── CLAUDE.md            # Domain documentation
```

### Core Components

#### 1. ScheduledTask Domain (`index.ts`)

The main domain class that manages queues and workers:

```typescript
class ScheduledTaskDomain {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private initialized = false;

  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  async scheduleAutoClose(ticketId: number, delayHours: number): Promise<string | null>;
  async cancelAutoClose(jobId: string): Promise<boolean>;
  async cancelAutoCloseForTicket(ticketId: number): Promise<void>;
  async cleanupOrphanedJobs(): Promise<void>;
}
```

#### 2. Queue Configuration (`queues/ticket-lifecycle.ts`)

Defines the ticket lifecycle queue with automatic job cleanup:

```typescript
export const ticketLifecycleQueue = new Queue("ticket-lifecycle", {
  connection: {
    /* Redis config */
  },
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 100, // Keep max 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
      count: 1000, // Keep max 1000 failed jobs
    },
  },
});
```

#### 3. Worker Implementation (`workers/ticket-lifecycle.ts`)

Processes jobs from the queue:

```typescript
export const ticketLifecycleWorker = new Worker(
  "ticket-lifecycle",
  async (job: Job) => {
    switch (job.name) {
      case "auto-close":
        return processAutoClose(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: {
      /* Redis config */
    },
    concurrency: 5, // Process up to 5 jobs simultaneously
    autorun: true, // Start processing immediately
  }
);
```

### Graceful Degradation

The system handles Redis unavailability gracefully:

1. **Initialization Check**: Verifies Redis connection before creating queues/workers
2. **Null Returns**: Methods return `null` when system is unavailable
3. **Console Warnings**: Logs warnings but doesn't crash
4. **Feature Degradation**: Auto-close becomes immediate close without Redis

## Implementation Details

### Job Types

#### Auto-Close Job

**Purpose**: Automatically close tickets after a delay if no response from opener

**Data Structure**:

```typescript
interface AutoCloseJobData {
  ticketId: number;
}
```

**Job Options**:

```typescript
{
  jobId: `auto-close-${ticketId}-${timestamp}`,
  delay: delayHours * 60 * 60 * 1000,  // Convert hours to milliseconds
  attempts: 3,                         // Retry up to 3 times
  backoff: {
    type: "exponential",
    delay: 60000,                      // Start with 1-minute delay
  },
  removeOnComplete: true,              // Clean up after success
  removeOnFail: false,                 // Keep for debugging
}
```

### Error Handling

The worker implements comprehensive error handling:

1. **Ticket Validation**: Checks if ticket exists and is still open
2. **State Verification**: Ensures close request is still valid
3. **Business Rules**: Respects `excludeFromAutoclose` flag
4. **Error Propagation**: Throws errors to trigger retries

### Retry Strategy

Failed jobs are retried with exponential backoff:

- 1st retry: 1 minute delay
- 2nd retry: 2 minute delay
- 3rd retry: 4 minute delay
- After 3 attempts: Job marked as failed

## Integration Points

### 1. TicketLifecycle Domain

The close request flow integrates with BullMQ:

```typescript
export const requestClose = async (input) => {
  // ... validation ...

  let autoCloseJobId: string | null = null;

  if (input.autoCloseHours && !ticket.excludeFromAutoclose) {
    afterTransaction(async () => {
      const { ScheduledTask } = await import("../scheduled-task");
      const jobId = await ScheduledTask.scheduleAutoClose(input.ticketId, input.autoCloseHours);
      autoCloseJobId = jobId;
    });
  }

  return { closeRequestId, autoCloseJobId };
};
```

### 2. Bot Startup

Initialize the system when the bot starts:

```typescript
// In ready.ts listener
try {
  await ScheduledTask.initialize();
  logger.info("✅ Scheduled task system initialized");

  // Clean up any orphaned jobs from previous runs
  await ScheduledTask.cleanupOrphanedJobs();
} catch (error) {
  logger.error("❌ Failed to initialize scheduled task system:", error);
}
```

### 3. Graceful Shutdown

Clean shutdown on SIGINT/SIGTERM:

```typescript
process.on("SIGINT", async () => {
  try {
    await ScheduledTask.shutdown();
    console.log("✅ Scheduled task system shut down");
  } catch (error) {
    console.error("❌ Error shutting down scheduled task system:", error);
  }
  process.exit(0);
});
```

## API Reference

### ScheduledTask.initialize()

Initialize queues and workers. Safe to call multiple times.

```typescript
await ScheduledTask.initialize();
```

### ScheduledTask.scheduleAutoClose(ticketId, delayHours)

Schedule a ticket to auto-close after specified hours.

**Parameters:**

- `ticketId: number` - The ticket to auto-close
- `delayHours: number` - Hours to wait before closing

**Returns:** `Promise<string | null>` - Job ID or null if scheduling failed

```typescript
const jobId = await ScheduledTask.scheduleAutoClose(123, 24); // Close after 24 hours
```

### ScheduledTask.cancelAutoClose(jobId)

Cancel a specific auto-close job.

**Parameters:**

- `jobId: string` - The job ID to cancel

**Returns:** `Promise<boolean>` - True if cancelled successfully

```typescript
const cancelled = await ScheduledTask.cancelAutoClose("auto-close-123-1234567890");
```

### ScheduledTask.cancelAutoCloseForTicket(ticketId)

Cancel all auto-close jobs for a ticket.

**Parameters:**

- `ticketId: number` - The ticket ID

```typescript
await ScheduledTask.cancelAutoCloseForTicket(123);
```

### ScheduledTask.cleanupOrphanedJobs()

Remove jobs for tickets that are no longer eligible for auto-close.

```typescript
await ScheduledTask.cleanupOrphanedJobs();
```

### ScheduledTask.shutdown()

Gracefully shut down all queues and workers.

```typescript
await ScheduledTask.shutdown();
```

## Usage Examples

### Example 1: Close Request with Auto-Close

```typescript
// In closerequest command
const { closeRequestId } = await TicketLifecycle.requestClose({
  ticketId: ticket.id,
  requestedById: userId,
  reason: "Issue resolved",
  autoCloseHours: 24, // Auto-close in 24 hours
});

// Response to user
await interaction.reply({
  content: "Close request sent. Ticket will auto-close in 24 hours if no response.",
});
```

### Example 2: Cancelling Close Request

```typescript
// When user denies close request
await TicketLifecycle.cancelCloseRequest(ticket.id, userId);
// This internally calls ScheduledTask.cancelAutoCloseForTicket()
```

### Example 3: Manual Job Management

```typescript
// Schedule a job
const jobId = await ScheduledTask.scheduleAutoClose(ticketId, 48);

// Later, cancel it
if (jobId) {
  await ScheduledTask.cancelAutoClose(jobId);
}
```

## Monitoring & Debugging

### Log Patterns

The system uses consistent logging:

```
🤖 Processing auto-close for ticket 123
✅ Successfully auto-closed ticket 123
❌ Failed to auto-close ticket 123: [error]
🧹 Starting cleanup of orphaned scheduled jobs...
✅ Cleaned up 5 orphaned jobs
```

### Common Issues

#### 1. Redis Connection Failed

**Symptom**: "Redis not available - scheduled tasks will be disabled"

**Solution**:

- Verify Redis is running
- Check REDIS_URL environment variable
- Ensure network connectivity

#### 2. Jobs Not Processing

**Symptom**: Jobs queued but not executing

**Possible Causes**:

- Worker not initialized
- Redis memory full
- Worker crashed

**Debugging**:

```typescript
// Check queue status
const queue = ScheduledTask.queues.get("ticket-lifecycle");
const waiting = await queue.getWaitingCount();
const delayed = await queue.getDelayedCount();
const failed = await queue.getFailedCount();
```

#### 3. Orphaned Jobs

**Symptom**: Jobs for closed/deleted tickets

**Solution**: Run cleanup on startup

```typescript
await ScheduledTask.cleanupOrphanedJobs();
```

### BullMQ Dashboard (Optional)

For production monitoring, consider adding Bull Dashboard:

```typescript
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(ticketLifecycleQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());
```

## Future Enhancements

### Additional Job Types

The system is designed to be extensible. Potential job types:

1. **Reminder Notifications**

```typescript
case "send-reminder":
  return processSendReminder(job);
```

2. **Periodic Cleanup**

```typescript
case "cleanup-old-tickets":
  return processCleanupOldTickets(job);
```

3. **Analytics Aggregation**

```typescript
case "aggregate-stats":
  return processAggregateStats(job);
```

### Scaling Considerations

For high-volume deployments:

1. **Multiple Workers**: Run workers in separate processes
2. **Queue Prioritization**: Use multiple queues with different priorities
3. **Rate Limiting**: Implement job rate limiting
4. **Monitoring**: Add metrics collection

### Migration from Other Systems

If migrating from other schedulers:

1. **Dual Running**: Run both systems temporarily
2. **Gradual Migration**: Move job types one at a time
3. **Data Migration**: Script to convert existing schedules
4. **Rollback Plan**: Keep old system available

## Conclusion

The BullMQ implementation provides a robust, scalable solution for background job processing in TicketsBot. It handles the current auto-close use case well and provides a foundation for future background processing needs. The graceful degradation ensures the system remains functional even without Redis, while the monitoring and debugging features make it maintainable in production.
