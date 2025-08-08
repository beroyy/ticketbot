import { useEffect, useState } from "react";

export function useHideScrollbar() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return { isClient };
}
