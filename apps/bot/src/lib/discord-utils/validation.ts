import { type Result, ok, err } from "@bot/lib/discord-utils/result";

/**
 * Ticket-specific validation utilities
 */
export const TicketValidation = {
  /**
   * Validate ticket subject
   */
  subject: (subject: string | null | undefined): Result<string | null> => {
    if (!subject) return ok(null);

    const trimmed = subject.trim();
    if (trimmed.length === 0) return ok(null);
    if (trimmed.length > 256) return err("Subject must be 256 characters or less");

    return ok(trimmed);
  },

  /**
   * Validate close reason
   */
  closeReason: (reason: string | null | undefined): Result<string | null> => {
    if (!reason) return ok(null);

    const trimmed = reason.trim();
    if (trimmed.length === 0) return ok(null);
    if (trimmed.length > 500) return err("Reason must be 500 characters or less");

    return ok(trimmed);
  },

  /**
   * Validate ticket ID
   */
  ticketId: (id: string | number): Result<number> => {
    const num = typeof id === "string" ? parseInt(id, 10) : id;
    if (isNaN(num) || num <= 0) return err("Invalid ticket ID");
    return ok(num);
  },

  /**
   * Validate feedback rating
   */
  rating: (rating: number): Result<number> => {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return err("Rating must be between 1 and 5");
    }
    return ok(rating);
  },

  /**
   * Validate feedback comment
   */
  feedbackComment: (comment: string | null | undefined): Result<string | null> => {
    if (!comment) return ok(null);

    const trimmed = comment.trim();
    if (trimmed.length === 0) return ok(null);
    if (trimmed.length > 1000) return err("Comment must be 1000 characters or less");

    return ok(trimmed);
  },
} as const;