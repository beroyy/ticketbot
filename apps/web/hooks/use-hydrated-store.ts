import { useEffect, useState } from "react";

/**
 * Hook to handle hydration safely with persisted Zustand stores in Next.js
 * This prevents the "Text content did not match" error during SSR
 *
 * @param store - The Zustand store to use
 * @param callback - Selector function to extract desired state
 * @returns The selected state, or undefined during SSR/initial render
 *
 * @example
 * ```tsx
 * // In a component
 * const selectedGuildId = useHydratedStore(useGlobalStore, (state) => state.selectedGuildId);
 *
 * // Handle the undefined state during SSR
 * if (selectedGuildId === undefined) {
 *   return <LoadingSpinner />; // or null, or default UI
 * }
 * ```
 */
export function useHydratedStore<T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F
): F | undefined {
  const result = store(callback) as F;
  const [data, setData] = useState<F>();

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
}
