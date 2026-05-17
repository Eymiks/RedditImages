import { useCallback, useEffect, useState } from "react";
import { normalizeSubreddit } from "./useFavorites";

const STORAGE_KEY = "reddit-image-pwa:recent";
const MAX_RECENT = 10;

function readRecent(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeSubreddit(String(item))).filter(Boolean).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function useRecent() {
  const [recent, setRecent] = useState<string[]>(() => readRecent());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  }, [recent]);

  const push = useCallback((name: string) => {
    const normalized = normalizeSubreddit(name);
    if (!normalized) return;
    setRecent((current) => {
      const filtered = current.filter((item) => item !== normalized);
      return [normalized, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const clear = useCallback(() => setRecent([]), []);

  return { recent, push, clear };
}
