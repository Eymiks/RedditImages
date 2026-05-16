import { normalizePosts } from "./imageFilter";
import { enrichRedgifsPosts } from "./redgifs";
import type {
  FeedTarget,
  ListingResult,
  RedditListingResponse,
  SortName,
  TopPeriod
} from "../types/reddit";

const LIMIT = 25;
const PUBLIC_BASE = "https://old.reddit.com";
const LISTING_CACHE_PREFIX = "reddit-image-pwa:listing:";
const LISTING_CACHE_MAX_AGE = 1000 * 60 * 60 * 12;

interface FetchListingParams {
  target: FeedTarget;
  sort: SortName;
  period: TopPeriod;
  after: string | null;
  retryCount?: number;
}

export async function fetchListing({
  target,
  sort,
  period,
  after,
  retryCount = 0
}: FetchListingParams): Promise<ListingResult> {
  const url = buildListingUrl(target, sort, period, after);
  const response = await fetchPublic(url);

  if (response.status === 429) {
    const cached = readCachedListing(url);
    if (cached) {
      return {
        ...cached,
        notice: "Reddit limite les requetes. Affichage du dernier cache disponible."
      };
    }

    const retryAfterSeconds = readRetryAfter(response) ?? 6;
    if (retryCount >= 1 || retryAfterSeconds > 10) {
      throw new Error(
        `Reddit limite les requetes pour le moment. Reessaie dans ${retryAfterSeconds} secondes.`
      );
    }

    await wait(retryAfterSeconds * 1000);
    return fetchListing({ target, sort, period, after, retryCount: retryCount + 1 });
  }

  if (response.status === 404) {
    throw new Error("Subreddit introuvable.");
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (message) {
      throw new Error(message);
    }

    throw new Error(`Reddit JSON a repondu ${response.status}.`);
  }

  const json = (await response.json()) as RedditListingResponse;
  const result = {
    posts: await enrichRedgifsPosts(normalizePosts(json.data.children.map((child) => child.data))),
    after: json.data.after
  };
  writeCachedListing(url, result);
  return result;
}

function buildListingUrl(
  target: FeedTarget,
  sort: SortName,
  period: TopPeriod,
  after: string | null
): string {
  const url = new URL(`${PUBLIC_BASE}/r/${encodeURIComponent(target.name)}/${sort}.json`);
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("raw_json", "1");
  if (after) {
    url.searchParams.set("after", after);
  }
  if (sort === "top") {
    url.searchParams.set("t", period);
  }
  return url.toString();
}

async function fetchPublic(url: string): Promise<Response> {
  const workerUrl = import.meta.env.VITE_WORKER_URL?.replace(/\/$/, "");
  const publicUrl = new URL(url);
  const directResponse = await fetchDirect(publicUrl);

  if (directResponse) {
    return directResponse;
  }

  if (workerUrl) {
    const proxied = new URL(`${workerUrl}/reddit`);
    proxied.searchParams.set("url", url);
    try {
      return await fetch(proxied);
    } catch (error) {
      if (!import.meta.env.DEV) {
        throw error;
      }
    }
  }

  if (import.meta.env.DEV) {
    return fetch(`${publicUrl.pathname.replace(/^\/?/, "/reddit-public/")}${publicUrl.search}`);
  }

  throw new Error("Configure VITE_WORKER_URL pour les appels publics Reddit en production.");
}

async function fetchDirect(url: URL): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
    const contentType = response.headers.get("Content-Type") ?? "";

    if (
      response.ok ||
      response.status === 404 ||
      response.status === 429 ||
      contentType.includes("application/json")
    ) {
      return response;
    }
  } catch {
    return null;
  }

  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.max(1, Math.ceil(seconds));
  }

  const date = Date.parse(retryAfter);
  if (Number.isFinite(date)) {
    return Math.max(1, Math.ceil((date - Date.now()) / 1000));
  }

  return null;
}

async function readErrorMessage(response: Response): Promise<string | null> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    const body = (await response.clone().json()) as { error?: string };
    return body.error ?? null;
  } catch {
    return null;
  }
}

function readCachedListing(url: string): ListingResult | null {
  const raw = localStorage.getItem(cacheKey(url));
  if (!raw) {
    return null;
  }

  try {
    const cached = JSON.parse(raw) as { savedAt: number; result: ListingResult };
    if (Date.now() - cached.savedAt > LISTING_CACHE_MAX_AGE) {
      localStorage.removeItem(cacheKey(url));
      return null;
    }
    return cached.result;
  } catch {
    localStorage.removeItem(cacheKey(url));
    return null;
  }
}

function writeCachedListing(url: string, result: ListingResult) {
  try {
    localStorage.setItem(
      cacheKey(url),
      JSON.stringify({
        savedAt: Date.now(),
        result
      })
    );
  } catch {
    pruneListingCache();
  }
}

function cacheKey(url: string): string {
  return `${LISTING_CACHE_PREFIX}${url}`;
}

function pruneListingCache() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(LISTING_CACHE_PREFIX))
    .slice(0, 20)
    .forEach((key) => localStorage.removeItem(key));
}
