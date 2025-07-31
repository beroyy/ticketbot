import { useEffect, useState } from "react";

type RefetchType = "critical" | "normal" | "background";

/**
 * Smart refetch hook that adjusts polling intervals based on user activity and document visibility.
 * 
 * @param type - The type of data being polled:
 *   - 'critical': Most important data (e.g., messages in viewed ticket) - fastest polling
 *   - 'normal': Standard importance (e.g., ticket list) - medium polling
 *   - 'background': Low priority (e.g., stats) - slowest polling
 * 
 * @returns Polling interval in milliseconds, or false to disable polling
 */
export function useSmartRefetch(type: RefetchType = "normal"): number | false {
  const [interval, setInterval] = useState(() => getInterval(type, true, false));

  useEffect(() => {
    let activityTimer: NodeJS.Timeout;
    let isActive = true;

    // Handle document visibility changes
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setInterval(getInterval(type, isActive, !isVisible));
    };

    // Reset activity timer and mark as active
    const handleActivity = () => {
      clearTimeout(activityTimer);
      
      if (!isActive) {
        isActive = true;
        setInterval(getInterval(type, true, document.hidden));
      }

      // Mark as idle after 60 seconds of inactivity
      activityTimer = setTimeout(() => {
        isActive = false;
        setInterval(getInterval(type, false, document.hidden));
      }, 60000);
    };

    // Listen for user activity
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize activity timer
    handleActivity();

    // Cleanup
    return () => {
      clearTimeout(activityTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [type]);

  return interval;
}

/**
 * Calculate the appropriate polling interval based on type and state
 */
function getInterval(type: RefetchType, isActive: boolean, isHidden: boolean): number | false {
  // Don't poll if tab is hidden, except for critical data
  if (isHidden && type !== "critical") {
    return false;
  }

  // If hidden and critical, use slow polling
  if (isHidden && type === "critical") {
    return 30000; // 30 seconds
  }

  // If user is idle, slow down or stop polling based on type
  if (!isActive) {
    switch (type) {
      case "critical":
        return 30000; // 30 seconds for critical data when idle
      case "normal":
        return false; // Stop polling normal data when idle
      case "background":
        return false; // Stop polling background data when idle
    }
  }

  // Active user - use optimal intervals
  switch (type) {
    case "critical":
      return 3000; // 3 seconds for critical data
    case "normal":
      return 10000; // 10 seconds for normal data
    case "background":
      return 30000; // 30 seconds for background data
  }
}