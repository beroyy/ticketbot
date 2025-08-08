/**
 * Service checking utilities for development environment
 * Provides functions to check PostgreSQL and database schema status
 */

import { PrismaClient } from "@prisma/client";

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
