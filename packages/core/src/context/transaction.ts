import { createContext } from "./index";
// import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma/client";
import { TransactionError } from "./errors";
import { ContextMonitoring } from "./monitoring";

/**
 * Transaction context for automatic transaction management with after-commit hooks
 * Production-ready implementation with proper error handling
 */

export interface TransactionContextValue {
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
        return TransactionContext.provideAsync({ tx, afterCommitHandlers: handlers }, callback);
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

/**
 * Register an effect to run after the current transaction commits
 * If not in a transaction, the effect runs immediately
 */
export function afterTransaction(effect: () => void | Promise<void>): void {
  const ctx = TransactionContext.tryUse();
  if (ctx) {
    // In transaction, add to handlers
    ctx.afterCommitHandlers.push(effect);
  } else {
    // Not in transaction, run immediately
    void Promise.resolve(effect()).catch((err) => {
      console.error("After-transaction effect failed:", err);
    });
  }
}

/**
 * Get the current transaction client or the default prisma client
 */
export function useTransaction(): any {
  const ctx = TransactionContext.tryUse();
  return ctx?.tx ?? prisma;
}
