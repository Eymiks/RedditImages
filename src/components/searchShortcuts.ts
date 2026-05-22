interface BuildSearchShortcutsInput {
  current: string;
  favorites: string[];
  recent: string[];
  favoriteLimit?: number;
  recentLimit?: number;
}

interface SearchShortcuts {
  favorites: string[];
  recent: string[];
}

export function buildSearchShortcuts({
  current,
  favorites,
  recent,
  favoriteLimit = 6,
  recentLimit = 5
}: BuildSearchShortcutsInput): SearchShortcuts {
  const blocked = new Set<string>();
  const currentKey = keyFor(current);
  if (currentKey) blocked.add(currentKey);

  const favoriteShortcuts = collectUnique(favorites, blocked, favoriteLimit);
  favoriteShortcuts.forEach((name) => blocked.add(keyFor(name)));

  return {
    favorites: favoriteShortcuts,
    recent: collectUnique(recent, blocked, recentLimit)
  };
}

function collectUnique(items: string[], blocked: Set<string>, limit: number): string[] {
  const result: string[] = [];
  const seen = new Set(blocked);

  for (const item of items) {
    const cleaned = cleanName(item);
    const key = keyFor(cleaned);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) break;
  }

  return result;
}

function cleanName(name: string): string {
  return name.trim().replace(/^r\//i, "").replace(/^\/r\//i, "");
}

function keyFor(name: string): string {
  return cleanName(name).toLowerCase();
}
