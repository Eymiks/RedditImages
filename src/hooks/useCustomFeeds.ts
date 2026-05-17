import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeSubreddit } from "./useFavorites";

const STORAGE_KEY = "reddit-image-pwa:custom-feeds";

export interface CustomFeed {
  id: string;
  name: string;
  subreddits: string[];
  createdAt: number;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeSubs(subs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of subs) {
    const name = normalizeSubreddit(raw);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function readFeeds(): CustomFeed[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): CustomFeed | null => {
        if (!item || typeof item !== "object") return null;
        const subs = Array.isArray(item.subreddits) ? sanitizeSubs(item.subreddits) : [];
        if (subs.length === 0 || !item.id || !item.name) return null;
        return {
          id: String(item.id),
          name: String(item.name).slice(0, 40),
          subreddits: subs,
          createdAt: Number(item.createdAt) || Date.now()
        };
      })
      .filter((feed): feed is CustomFeed => feed !== null);
  } catch {
    return [];
  }
}

export function useCustomFeeds() {
  const [feeds, setFeeds] = useState<CustomFeed[]>(() => readFeeds());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
  }, [feeds]);

  const create = useCallback((name: string, subreddits: string[]) => {
    const cleanName = name.trim().slice(0, 40);
    const cleanSubs = sanitizeSubs(subreddits);
    if (!cleanName || cleanSubs.length === 0) return null;
    const feed: CustomFeed = {
      id: generateId(),
      name: cleanName,
      subreddits: cleanSubs,
      createdAt: Date.now()
    };
    setFeeds((current) => [...current, feed]);
    return feed;
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<CustomFeed, "id" | "createdAt">>) => {
    setFeeds((current) =>
      current.map((feed) => {
        if (feed.id !== id) return feed;
        return {
          ...feed,
          name: patch.name !== undefined ? patch.name.trim().slice(0, 40) || feed.name : feed.name,
          subreddits: patch.subreddits ? sanitizeSubs(patch.subreddits) : feed.subreddits
        };
      })
    );
  }, []);

  const remove = useCallback((id: string) => {
    setFeeds((current) => current.filter((feed) => feed.id !== id));
  }, []);

  const get = useCallback((id: string) => feeds.find((feed) => feed.id === id) ?? null, [feeds]);

  const byId = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);

  return { feeds, create, update, remove, get, byId };
}
