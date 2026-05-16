import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchListing } from "../api/reddit";
import type { FeedTarget, ImagePost, SortName, TopPeriod } from "../types/reddit";

export function useFeed(target: FeedTarget, sort: SortName, period: TopPeriod) {
  const [posts, setPosts] = useState<ImagePost[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const seenIds = useRef(new Set<string>());
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const feedKey = useMemo(() => JSON.stringify({ target, sort, period }), [period, sort, target]);

  const loadPage = useCallback(
    async (nextAfter: string | null, reset: boolean) => {
      if (loadingRef.current || (!reset && !hasMoreRef.current)) {
        return;
      }

      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchListing({
          target,
          sort,
          period,
          after: nextAfter
        });

        if (reset) {
          seenIds.current = new Set();
        }

        setPosts((current) => {
          const next = reset ? [] : [...current];
          result.posts.forEach((post) => {
            if (!seenIds.current.has(post.id)) {
              seenIds.current.add(post.id);
              next.push(post);
            }
          });
          return next;
        });
        setAfter(result.after);
        hasMoreRef.current = Boolean(result.after);
        setHasMore(Boolean(result.after));
        if (result.notice) {
          setError(result.notice);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    [period, sort, target]
  );

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    await loadPage(after, false);
  }, [after, hasMore, isLoading, loadPage]);

  useEffect(() => {
    seenIds.current = new Set();
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

  return {
    posts,
    isLoading,
    isInitialLoading,
    error,
    hasMore,
    loadMore,
    retry: () => loadPage(after, false)
  };
}
