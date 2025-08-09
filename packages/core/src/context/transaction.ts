import { createContext } from "./index";
// import type { PrismaClient } from "@prisma/client";
import { prisma } from "@ticketsbot/db";
import { TransactionError } from "./errors";
import { ContextMonitoring } from "./monitoring";

/**
 * Transaction context for automatic transaction management with after-commit hooks
 * Production-ready implementation with proper error handling
 */

export interface TransactionContextValue {
  type: "transaction"; // For consistent context logging
  tx: any; // Using any to avoid Prisma transaction client type issues
  afterCommitHandlers: (() => void | Promise<void>)[];
}

export const TransactionContext = createContext<TransactionContextValue>("Transaction");

/**
 * Execute a callback within a database transaction
 * Automatically handles nested transactions and after-commit hooks
 */
export async function withTransaction<T>(callback: () => Promise<T>): Promise<T> {
  // Check if we're already in a transaction
  const currentTx = TransactionContext.tryUse();
  if (currentTx) {
    // Already in transaction, just execute the callback
    const logger = ContextMonitoring.getLogger();
    logger.debug("Reusing existing transaction");
    return callback();
  }

  // Start a new transaction
  const handlers: (() => void | Promise<void>)[] = [];
  const timer = ContextMonitoring.startTimer("transaction.execute");
  let result: T;

  try {
    result = await prisma.$transaction(
      async (tx: any) => {
        // Execute callback with transaction context
        return TransactionContext.provideAsync(
          { type: "transaction", tx, afterCommitHandlers: handlers },
          callback
        );
      },
      {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      }
    );

    timer.end({ success: true, handlerCount: handlers.length });
  } catch (error) {
    timer.end({ success: false, error: true });
    // Transaction failed, don't run after-commit handlers
    if (error instanceof Error) {
      throw new TransactionError(`Transaction failed: ${error.message}`);
    }
    throw new TransactionError("Transaction failed with unknown error");
  }

  // Transaction successful, run after-commit handlers
  // These run AFTER the transaction commits
  if (handlers.length > 0) {
    const handlerTimer = ContextMonitoring.startTimer("transaction.afterCommit");
    try {
      await Promise.all(handlers.map((handler) => handler()));
      handlerTimer.end({ handlerCount: handlers.length });
    } catch (error) {
      handlerTimer.end({ error: true, handlerCount: handlers.length });
      const logger = ContextMonitoring.getLogger();
      logger.error(
        "After-commit handler failed",
        error instanceof Error ? error : new Error(String(error))
      );
      // Note: Transaction already committed, so we can't roll back
    }
  }

  return result;
}

// afterTransaction function has been removed
// Use explicit post-transaction code instead:
// const result = await prisma.$transaction(async (tx) => { ... });
// // External effects after transaction
// await externalService.notify(result);

