import { getRedisService } from "../auth/services/redis";
import type { RedisClientType } from "redis";

export function isRedisAvailable(): boolean {
  const service = getRedisService();
  return service !== null && service.isReady();
}

export function getRedisConnection(): RedisClientType | null {
  const service = getRedisService();
  if (!service) {
    return null;
  }
  
  try {
    const client = service.getClient();
    return client as any;
  } catch {
    return null;
  }
}