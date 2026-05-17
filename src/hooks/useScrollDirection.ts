import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 5) {
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Never collapse when near the top (allow pull-to-refresh to work)
      if (y < 10) {
        setCollapsed(false);
        lastScrollY.current = y;
        return;
      }
      const delta = y - lastScrollY.current;
      if (Math.abs(delta) < threshold) return;
      setCollapsed(delta > 0);
      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return collapsed;
}
