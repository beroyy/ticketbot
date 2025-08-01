// Message types
export const MESSAGE_TYPES = {
  USER: "user",
  STAFF: "staff",
  BOT: "bot",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// Tab values
export const TICKET_TABS = {
  ACTIVE: "active",
  CLOSED: "closed",
} as const;

export type TicketTab = (typeof TICKET_TABS)[keyof typeof TICKET_TABS];

// Default values
export const DEFAULT_URGENCY = "5/10";

// UI constants
export const EMOJI_PROGRESS_SIZE = 50;
export const EMOJI_PROGRESS_STROKE_WIDTH = 4;

// Date format patterns
export const DATE_FORMATS = {
  TICKET_DATE: "D MMM YY",
  TIMESTAMP: "h:mm A",
  FULL_DATE: "M/D/YYYY",
  MONTH_DAY: "MMM D, YYYY",
  PARSE_FORMATS: ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "D MMM YY", "DD MMM YY"],
} as const;

// Tenor GIF embed dimensions
export const TENOR_EMBED = {
  WIDTH: 300,
  HEIGHT: 300,
} as const;

// Avatar sizes
export const AVATAR_SIZES = {
  SMALL: 32,
  MEDIUM: 48,
} as const;

// Style constants
export const TICKET_CARD_STYLES = {
  SELECTED: {
    border: "1px solid #5C7DE5",
    background: "#FBFCFF",
    boxShadow: "0px 4px 5px 0px rgba(10, 13, 20, 0.03)",
  },
  DEFAULT: {
    border: "1px solid #E1E4EA",
    background: "#FFF",
    boxShadow: "0px 1px 2px 0px rgba(10, 13, 20, 0.03)",
  },
} as const;

// Refetch intervals
export const REFETCH_INTERVALS = {
  NORMAL: "normal",
  CRITICAL: "critical",
} as const;
