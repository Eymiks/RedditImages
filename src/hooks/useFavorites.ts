import { useCallback, useEffect, useMemo, useState } from "react";

const FAVORITES_KEY = "reddit-image-pwa:favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites());

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((name: string) => {
    const normalized = normalizeSubreddit(name);
    if (!normalized) {
      return;
    }

    setFavorites((current) =>
      current.includes(normalized) ? current : [...current, normalized].sort()
    );
  }, []);

  const removeFavorite = useCallback((name: string) => {
    const normalized = normalizeSubreddit(name);
    setFavorites((current) => current.filter((favorite) => favorite !== normalized));
  }, []);

  const toggleFavorite = useCallback(
    (name: string) => {
      const normalized = normalizeSubreddit(name);
      if (!normalized) {
        return;
      }

      setFavorites((current) =>
        current.includes(normalized)
          ? current.filter((favorite) => favorite !== normalized)
          : [...current, normalized].sort()
      );
    },
    []
  );

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  return {
    favorites,
    favoriteSet,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite: useCallback((name: string) => favoriteSet.has(normalizeSubreddit(name)), [favoriteSet])
  };
}

export function normalizeSubreddit(name: string): string {
  return name.trim().replace(/^r\//i, "").replace(/^\/r\//i, "").toLowerCase();
}

function readFavorites(): string[] {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) {
    return ["pics", "earthporn", "itookapicture", "mildlyinteresting"];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeSubreddit(String(item))).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}
