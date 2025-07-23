import type { Queue, Worker } from "bullmq";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Job } from "bullmq";
import { Redis } from "../../redis";
import { getTicketLifecycleQueue } from "./queues/ticket-lifecycle";
import { getTicketLifecycleWorker } from "./workers/ticket-lifecycle";

export type { Job } from "bullmq";

class ScheduledTaskDomain {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private initialized = false;

  async initialize() {
    if (this.initialized || !Redis.isAvailable()) {
      return;
    }

    try {
      const queue = await getTicketLifecycleQueue();
      const worker = await getTicketLifecycleWorker();

      if (queue) {
        this.queues.set("ticket-lifecycle", queue);
      }
      if (worker) {
        this.workers.set("ticket-lifecycle", worker);
      }

      this.initialized = queue !== null && worker !== null;
      if (this.initialized) {
        console.log("✅ Scheduled task system initialized");
      } else {
        console.warn("⚠️  Scheduled task system partially initialized");
      }
    } catch (error) {
      console.error("❌ Failed to initialize scheduled task system:", error);
    }
  }

  async shutdown() {
    const closePromises: Promise<void>[] = [];

    for (const [name, worker] of this.workers) {
      console.log(`Shutting down worker: ${name}`);
      closePromises.push(worker.close());
    }

    for (const [name, queue] of this.queues) {
      console.log(`Closing queue: ${name}`);
      closePromises.push(queue.close());
    }

    await Promise.all(closePromises);
    this.initialized = false;
    console.log("✅ Scheduled task system shut down");
  }

  async scheduleAutoClose(ticketId: number, delayHours: number): Promise<string | null> {
    if (!this.initialized) {
      console.warn("Scheduled task system not initialized - auto-close will not be scheduled");
      return null;
    }

    const queue = this.queues.get("ticket-lifecycle");
    if (!queue) {
      return null;
    }

    const jobId = `auto-close-${ticketId}-${Date.now()}`;
    const delayMs = delayHours * 60 * 60 * 1000;

    const job = await queue.add(
      "auto-close",
      { ticketId },
      {
        jobId,
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 60000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return job.id as string;
  }

  async cancelAutoClose(jobId: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    const queue = this.queues.get("ticket-lifecycle");
    if (!queue) {
      return false;
    }

    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        return true;
      }
    } catch (error) {
      console.error(`Failed to cancel auto-close job ${jobId}:`, error);
    }

    return false;
  }

  async cancelAutoCloseForTicket(ticketId: number): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const queue = this.queues.get("ticket-lifecycle");
    if (!queue) {
      return;
    }

    try {
      const jobs = await queue.getJobs(["delayed", "waiting"]);
      const ticketJobs = jobs.filter(
        (job) => job.name === "auto-close" && job.data.ticketId === ticketId
      );

      await Promise.all(ticketJobs.map((job) => job.remove()));
    } catch (error) {
      console.error(`Failed to cancel auto-close jobs for ticket ${ticketId}:`, error);
    }
  }

  async cleanupOrphanedJobs(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log("🧹 Starting cleanup of orphaned scheduled jobs...");

    const queue = this.queues.get("ticket-lifecycle");
    if (!queue) {
      return;
    }

    try {
      const jobs = await queue.getJobs(["delayed", "waiting", "failed"]);
      console.log(`Found ${jobs.length} pending jobs to check`);

      const { Ticket } = await import("../ticket");
      let removedCount = 0;

      for (const job of jobs) {
        if (job.name === "auto-close") {
          const ticket = await Ticket.getByIdUnchecked(job.data.ticketId);
          
          if (!ticket || ticket.status !== "OPEN" || !ticket.closeRequestId) {
            await job.remove();
            removedCount++;
          }
        }
      }

      console.log(`✅ Cleaned up ${removedCount} orphaned jobs`);
    } catch (error) {
      console.error("❌ Failed to cleanup orphaned jobs:", error);
    }
  }
}

export const ScheduledTask = new ScheduledTaskDomain();