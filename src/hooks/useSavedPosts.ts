import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImagePost } from "../types/reddit";

const STORAGE_KEY = "reddit-image-pwa:saved-posts";

function readSaved(): Record<string, ImagePost> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, ImagePost>;
  } catch {
    return {};
  }
}

export function useSavedPosts() {
  const [saved, setSaved] = useState<Record<string, ImagePost>>(() => readSaved());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved]);

  const isSaved = useCallback((id: string) => saved[id] !== undefined, [saved]);

  const toggle = useCallback((post: ImagePost) => {
    setSaved((current) => {
      const next = { ...current };
      if (next[post.id]) {
        delete next[post.id];
      } else {
        next[post.id] = post;
      }
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const list = useMemo(
    () => Object.values(saved).sort((a, b) => b.id.localeCompare(a.id)),
    [saved]
  );

  return { saved, list, isSaved, toggle, remove };
}
