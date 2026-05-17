const PUBLIC_BASE = "https://old.reddit.com";

export interface SubredditSuggestion {
  name: string;
  subscribers: number;
  iconUrl: string | null;
  nsfw: boolean;
}

interface RawSubreddit {
  name?: string;
  numSubscribers?: number;
  iconImg?: string;
  primaryColor?: string;
  isNsfw?: boolean;
}

interface RedditAutocompleteResponse {
  subreddits?: RawSubreddit[];
}

export async function fetchSubredditSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<SubredditSuggestion[]> {
  const cleaned = query.trim();
  if (cleaned.length < 2) return [];

  const url = new URL(`${PUBLIC_BASE}/api/subreddit_autocomplete_v2.json`);
  url.searchParams.set("query", cleaned);
  url.searchParams.set("include_over_18", "true");
  url.searchParams.set("include_profiles", "false");
  url.searchParams.set("limit", "8");
  url.searchParams.set("raw_json", "1");

  const response = await fetchAutocomplete(url.toString(), signal);
  if (!response.ok) return [];

  try {
    const json = (await response.json()) as RedditAutocompleteResponse;
    const raw = Array.isArray(json.subreddits) ? json.subreddits : [];
    return raw
      .map((item): SubredditSuggestion | null => {
        const name = (item.name ?? "").replace(/^r\//i, "").toLowerCase();
        if (!name) return null;
        return {
          name,
          subscribers: Number(item.numSubscribers) || 0,
          iconUrl: item.iconImg ? item.iconImg : null,
          nsfw: Boolean(item.isNsfw)
        };
      })
      .filter((item): item is SubredditSuggestion => item !== null);
  } catch {
    return [];
  }
}

async function fetchAutocomplete(url: string, signal?: AbortSignal): Promise<Response> {
  const workerUrl = import.meta.env.VITE_WORKER_URL?.replace(/\/$/, "");
  try {
    const direct = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (direct.ok) return direct;
  } catch {
    // continue to fallback
  }

  if (import.meta.env.DEV) {
    try {
      const parsed = new URL(url);
      return await fetch(`/reddit-public${parsed.pathname}${parsed.search}`, { signal });
    } catch {
      // continue
    }
  }

  if (workerUrl) {
    const proxied = new URL(`${workerUrl}/reddit`);
    proxied.searchParams.set("url", url);
    return fetch(proxied, { signal });
  }

  return new Response(null, { status: 502 });
}
