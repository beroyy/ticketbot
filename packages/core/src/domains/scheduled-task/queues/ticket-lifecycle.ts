import { Queue } from "bullmq";
import { isRedisAvailable } from "../../../redis";

// Only create queue if Redis is available
const createQueue = () => {
  if (!isRedisAvailable()) {
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  return new Queue("ticket-lifecycle", {
    connection: {
      // Parse Redis URL to get connection options
      ...parseRedisUrl(redisUrl),
    },
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

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379"),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  };
}

export const ticketLifecycleQueue = createQueue()!;