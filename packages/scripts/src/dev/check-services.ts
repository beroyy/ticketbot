/**
 * Service checking utilities for development environment
 * Provides functions to check PostgreSQL, Redis, and database schema status
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

/**
 * Check if PostgreSQL is accessible using the DATABASE_URL
 */
export async function checkPostgresConnection(): Promise<boolean> {
  const prisma = new PrismaClient({
    // Suppress Prisma's verbose output during connection checks
    log: [],
  });

  try {
    await prisma.$connect();
    await prisma.$disconnect();
    return true;
  } catch (error) {
    await prisma.$disconnect().catch(() => {
      // Ignore disconnect errors
    });
    return false;
  }
}

/**
 * Check if the database schema is initialized by querying a core table
 */
export async function checkDatabaseSchema(): Promise<boolean> {
  const prisma = new PrismaClient({
    log: [],
  });

  try {
    // Try to query the user table - if it exists, schema is initialized
    await prisma.user.findFirst({
      take: 1,
    });
    await prisma.$disconnect();
    return true;
  } catch (error) {
    await prisma.$disconnect().catch(() => {
      // Ignore disconnect errors
    });
    return false;
  }
}

/**
 * Check if Redis is accessible using the REDIS_URL
 */
export async function checkRedisConnection(): Promise<boolean> {
  // If no REDIS_URL is configured, Redis is not available
  if (!process.env.REDIS_URL) {
    return false;
  }

  const client = createClient({
    url: process.env.REDIS_URL,
    // Short timeout for quick checks
    socket: {
      connectTimeout: 2000,
      // Disable reconnect for simple check
      reconnectStrategy: false,
    },
  });

  // Suppress Redis error events during check
  client.on("error", () => {
    // Ignore errors - we'll handle via return value
  });

  try {
    await client.connect();
    await client.ping();
    await client.disconnect();
    return true;
  } catch (error) {
    // Ensure client is disconnected even on error
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    return false;
  }
}
