import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchListing } from "../api/reddit";
import type { FeedTarget, ImagePost, SortName, TopPeriod } from "../types/reddit";

function getPrimaryDedupeKey(post: ImagePost): string | null {
  const asset = post.assets[0];
  if (!asset) return null;
  if (asset.redgifsId) return `redgifs:${asset.redgifsId}`;
  if (asset.url) return asset.url.split(/[?#]/)[0];
  return null;
}

export function useFeed(
  target: FeedTarget,
  sort: SortName,
  period: TopPeriod,
  options: { allowNsfw?: boolean } = {}
) {
  const allowNsfw = options.allowNsfw ?? true;
  const [posts, setPosts] = useState<ImagePost[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const seenIds = useRef(new Set<string>());
  const seenUrls = useRef(new Set<string>());
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const requestIdRef = useRef(0);

  const feedKey = useMemo(
    () => JSON.stringify({ target, sort, period, allowNsfw }),
    [allowNsfw, period, sort, target]
  );

  const loadPage = useCallback(
    async (nextAfter: string | null, reset: boolean) => {
      if (!reset && (loadingRef.current || !hasMoreRef.current)) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchListing({
          target,
          sort,
          period,
          after: nextAfter,
          allowNsfw
        });
        if (reset) {
          seenIds.current = new Set();
          seenUrls.current = new Set();
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        const nextSeenIds = reset ? new Set<string>() : new Set(seenIds.current);
        const nextSeenUrls = reset ? new Set<string>() : new Set(seenUrls.current);
        const unseenPosts = result.posts.filter((post) => {
          if (nextSeenIds.has(post.id)) return false;
          const key = getPrimaryDedupeKey(post);
          if (key && nextSeenUrls.has(key)) return false;
          nextSeenIds.add(post.id);
          if (key) nextSeenUrls.add(key);
          return true;
        });

        seenIds.current = nextSeenIds;
        seenUrls.current = nextSeenUrls;
        setPosts((current) => (reset ? unseenPosts : [...current, ...unseenPosts]));
        setAfter(result.after);
        hasMoreRef.current = Boolean(result.after);
        setHasMore(Boolean(result.after));
        if (result.notice) {
          setError(result.notice);
        }
      } catch (loadError) {
        if (requestId === requestIdRef.current) {
          setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      }
    },
    [allowNsfw, period, sort, target]
  );

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    await loadPage(after, false);
  }, [after, hasMore, isLoading, loadPage]);

  useEffect(() => {
    requestIdRef.current += 1;
    loadingRef.current = false;
    seenIds.current = new Set();
    seenUrls.current = new Set();
    setPosts([]);
    setAfter(null);
    hasMoreRef.current = true;
    setHasMore(true);
    setError(null);
    setIsInitialLoading(true);
  }, [feedKey]);

  useEffect(() => {
    void loadPage(null, true);
  }, [feedKey, loadPage]);

  const refresh = useCallback(async () => {
    requestIdRef.current += 1;
    loadingRef.current = false;
    hasMoreRef.current = true;
    setHasMore(true);
    await loadPage(null, true);
  }, [loadPage]);

  return {
    posts,
    isLoading,
    isInitialLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    retry: () => loadPage(after, false)
  };
}
