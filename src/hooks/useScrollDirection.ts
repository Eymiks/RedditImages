import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 5) {
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  // Track current state in a ref to avoid calling setState with the same value
  // on every scroll event, which would cause unnecessary re-renders.
  const collapsedRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Never collapse when near the top (allow pull-to-refresh to work)
      if (y < 10) {
        if (collapsedRef.current) {
          collapsedRef.current = false;
          setCollapsed(false);
        }
        lastScrollY.current = y;
        return;
      }
      const delta = y - lastScrollY.current;
      if (Math.abs(delta) < threshold) return;
      const next = delta > 0;
      if (next !== collapsedRef.current) {
        collapsedRef.current = next;
        setCollapsed(next);
      }
      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return collapsed;
}
