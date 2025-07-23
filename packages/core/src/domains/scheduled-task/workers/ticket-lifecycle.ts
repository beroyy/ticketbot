import { Worker, type Job } from "bullmq";
import { Redis } from "../../../redis";
import { TicketLifecycle } from "../../ticket-lifecycle";
import { Ticket } from "../../ticket";

interface AutoCloseJobData {
  ticketId: number;
}

async function processAutoClose(job: Job<AutoCloseJobData>) {
  const { ticketId } = job.data;
  
  console.log(`🤖 Processing auto-close for ticket ${ticketId}`);

  try {
    const ticket = await Ticket.getByIdUnchecked(ticketId);
    
    if (!ticket) {
      console.log(`Ticket ${ticketId} not found - skipping auto-close`);
      return;
    }

    if (ticket.status !== "OPEN") {
      console.log(`Ticket ${ticketId} is not open (status: ${ticket.status}) - skipping auto-close`);
      return;
    }

    if (!ticket.closeRequestBy) {
      console.log(`Ticket ${ticketId} has no close request initiator - skipping auto-close`);
      return;
    }

    if (ticket.excludeFromAutoclose) {
      console.log(`Ticket ${ticketId} is excluded from auto-close - skipping`);
      return;
    }

    await TicketLifecycle.autoClose(ticketId, ticket.closeRequestBy);
    
    console.log(`✅ Successfully auto-closed ticket ${ticketId}`);
  } catch (error) {
    console.error(`❌ Failed to auto-close ticket ${ticketId}:`, error);
    throw error;
  }
}

const createWorker = async () => {
  const client = await Redis.getClient();
  if (!client) {
    return null;
  }

  return new Worker(
    "ticket-lifecycle",
    async (job: Job) => {
      switch (job.name) {
        case "auto-close":
          return processAutoClose(job as Job<AutoCloseJobData>);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: client as any,
      concurrency: 5,
      autorun: true,
    }
  );
};

// Export a lazy-loaded worker instance
let _worker: Worker | null = null;

export const getTicketLifecycleWorker = async (): Promise<Worker | null> => {
  if (!_worker) {
    _worker = await createWorker();
  }
  return _worker;
};

// For backward compatibility
export const ticketLifecycleWorker = null as Worker | null;