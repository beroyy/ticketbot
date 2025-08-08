import { createHmac } from "crypto";
import { createLogger } from "@ticketsbot/core";

const logger = createLogger("web:hmac");

const HMAC_SECRET = process.env.API_SECRET || "development-secret";

// Validate HMAC secret in production
if (process.env.NODE_ENV === "production" && !process.env.API_SECRET) {
  logger.error("API_SECRET is not set in production! HMAC authentication will fail.");
  throw new Error("API_SECRET environment variable is required in production");
}

// Warn in development if using default
if (process.env.NODE_ENV === "development" && !process.env.API_SECRET) {
  logger.warn("Using default HMAC secret for development. Set API_SECRET for production.");
}

export interface HmacPayload {
  userId: string;
  email: string;
  discordUserId: string | null;
  selectedGuildId?: string;
  permissions?: string; // BigInt as string
  sessionId: string;
  expiresAt: string | Date;
  timestamp: number;
}

/**
 * Create HMAC signature for a payload
 */
export const signPayload = (payload: HmacPayload | string): string => {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  return createHmac("sha256", HMAC_SECRET).update(data).digest("hex");
};

/**
 * Verify HMAC signature
 */
export const verifyHmac = (payload: string, signature: string): boolean => {
  const expected = createHmac("sha256", HMAC_SECRET).update(payload).digest("hex");
  return signature === expected;
};

/**
 * Create headers for HMAC authentication
 */
export const createHmacHeaders = (payload: HmacPayload): Record<string, string> => {
  const payloadStr = JSON.stringify(payload);
  const signature = signPayload(payloadStr);
  
  return {
    "X-Auth-Payload": Buffer.from(payloadStr).toString("base64"),
    "X-Auth-Signature": signature,
  };
};
