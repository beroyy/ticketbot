import { Worker, type Job } from "bullmq";
import { isRedisAvailable } from "../../../redis";
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

const createWorker = () => {
  if (!isRedisAvailable()) {
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  const parsed = new URL(redisUrl);
  const connection = {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379"),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  };

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
      connection,
      concurrency: 5,
      autorun: true,
    }
  );
};

export const ticketLifecycleWorker = createWorker()!;