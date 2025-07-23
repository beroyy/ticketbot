import { useEffect, useRef } from "react";

export function useForwardedRef<T>(forwardedRef: React.Ref<T>) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!forwardedRef) return;

    if (typeof forwardedRef === "function") {
      forwardedRef(ref.current);
    } else if ("current" in forwardedRef) {
      // Type assertion to handle mutable ref
      (forwardedRef as React.MutableRefObject<T | null>).current = ref.current;
    }
  });

  return ref;
}
