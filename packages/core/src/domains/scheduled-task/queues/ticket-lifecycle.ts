import { Queue } from "bullmq";
import { Redis } from "../../../redis";

// Only create queue if Redis is available
const createQueue = async () => {
  const client = await Redis.getClient();
  if (!client) {
    return null;
  }

  return new Queue("ticket-lifecycle", {
    connection: client as any,
    defaultJobOptions: {
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 100,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 1000,
      },
    },
  });
};

// Export a lazy-loaded queue instance
let _queue: Queue | null = null;

export const getTicketLifecycleQueue = async (): Promise<Queue | null> => {
  if (!_queue) {
    _queue = await createQueue();
  }
  return _queue;
};

// For backward compatibility
export const ticketLifecycleQueue = null as Queue | null;
