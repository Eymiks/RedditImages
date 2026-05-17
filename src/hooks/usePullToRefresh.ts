import { useCallback, useEffect, useRef, useState } from "react";
import { haptic } from "../utils/haptics";

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  maxPull?: number;
  enabled?: boolean;
}

interface UsePullToRefreshResult {
  pull: number;
  isRefreshing: boolean;
  triggered: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 120,
  enabled = true
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pull, setPull] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const triggered = pull >= threshold;
  const hapticFiredRef = useRef(false);
  // Tracks current pull amount in a ref so onTouchEnd doesn't need `pull` as a dep
  const pullRef = useRef(0);
  const isRefreshingRef = useRef(false);

  const reset = useCallback(() => {
    startYRef.current = null;
    activeRef.current = false;
    pullRef.current = 0;
    setPull(0);
    hapticFiredRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || isRefreshingRef.current) {
        return;
      }
      startYRef.current = event.touches[0]?.clientY ?? null;
      activeRef.current = true;
      hapticFiredRef.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!activeRef.current || startYRef.current === null) {
        return;
      }
      if (window.scrollY > 0) {
        reset();
        return;
      }
      const delta = (event.touches[0]?.clientY ?? 0) - startYRef.current;
      if (delta <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const damped = Math.min(maxPull, delta * 0.5);
      pullRef.current = damped;
      setPull(damped);
      if (!hapticFiredRef.current && damped >= threshold) {
        hapticFiredRef.current = true;
        haptic("medium");
      }
    };

    const onTouchEnd = async () => {
      if (!activeRef.current) {
        return;
      }
      // Use ref instead of state to avoid `pull` in deps (would re-create listeners at 60fps)
      const reached = pullRef.current >= threshold;
      activeRef.current = false;
      startYRef.current = null;
      pullRef.current = 0;
      if (reached) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setPull(0);
          haptic("success");
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", reset);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [enabled, maxPull, onRefresh, reset, threshold]);

  return { pull, isRefreshing, triggered };
}
