/**
 * Formatting utilities for statistics displays
 */
export const StatsHelpers = {
  /**
   * Format a rating with star emoji
   */
  formatRating(rating: string | null): string {
    return rating ? `⭐ ${rating}` : "⭐ N/A";
  },

  /**
   * Format a percentage from value and total
   */
  formatPercentage(value: number, total: number): string {
    return total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
  },

  /**
   * Format time duration in minutes to human-readable format
   */
  formatDuration(minutes: number | null): string {
    if (!minutes) return "N/A";

    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      // Less than 24 hours
      return `${Math.round(minutes / 60)}h`;
    } else {
      return `${Math.round(minutes / 1440)}d`;
    }
  },

  /**
   * Format large numbers with commas
   */
  formatNumber(num: number): string {
    return num.toLocaleString();
  },

  /**
   * Get medal emoji for leaderboard position
   */
  getMedalEmoji(position: number): string {
    const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
    return medals[position] || "🏅";
  },
};

// Constants for stats displays
export const STATS_CONSTANTS = {
  MEDALS: ["🥇", "🥈", "🥉", "🏅", "🏅"],
  TOP_PERFORMERS_LIMIT: 5,
  SERVER_STATS_DAYS: {
    WEEK: 7,
    MONTH: 30,
  },
} as const;
