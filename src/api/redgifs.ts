import type { ImagePost } from "../types/reddit";

export interface ResolvedRedgifsMedia {
  id: string;
  url: string;
  previewUrl: string;
  externalUrl: string;
}

interface RedgifsProxyResponse {
  id?: string;
  urls?: {
    hd?: string;
    sd?: string;
    poster?: string;
    thumbnail?: string;
    vthumbnail?: string;
  };
}

export async function enrichRedgifsPosts(posts: ImagePost[]): Promise<ImagePost[]> {
  const redgifsAssets = posts.flatMap((post) =>
    post.assets.filter((asset) => asset.source === "redgifs" && asset.redgifsId)
  );

  if (redgifsAssets.length === 0) {
    return posts;
  }

  const uniqueIds = [
    ...new Set(redgifsAssets.map((asset) => asset.redgifsId).filter((id): id is string => Boolean(id)))
  ];
  const resolvedEntries = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return [id, await resolveRedgifsMedia(id)] as const;
      } catch {
        return [id, null] as const;
      }
    })
  );
  const resolvedById = new Map(resolvedEntries);

  const enrichedPosts = posts.map((post) => ({
    ...post,
    assets: post.assets.map((asset) => {
      if (asset.source !== "redgifs" || !asset.redgifsId) {
        return asset;
      }

      const resolved = resolvedById.get(asset.redgifsId);
      if (!resolved) {
        return asset;
      }

      return {
        ...asset,
        url: resolved.url,
        previewUrl: resolved.previewUrl || asset.previewUrl,
        externalUrl: resolved.externalUrl
      };
    })
  }));

  return enrichedPosts.filter((post) => {
    const redgifsAssets = post.assets.filter((a) => a.source === "redgifs");
    if (redgifsAssets.length === 0) return true;
    return redgifsAssets.some((a) => a.url !== "");
  });
}

async function resolveRedgifsMedia(id: string): Promise<ResolvedRedgifsMedia> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  const response = await fetchWithDevFallback(id, controller.signal).finally(() => {
    window.clearTimeout(timeout);
  });
  if (!response.ok) {
    throw new Error(`Redgifs a repondu ${response.status}.`);
  }

  const json = (await response.json()) as RedgifsProxyResponse;
  const url = rewriteRedgifsMediaUrl(json.urls?.hd ?? json.urls?.sd);
  const previewUrl = rewriteRedgifsMediaUrl(
    json.urls?.thumbnail ?? json.urls?.poster ?? json.urls?.vthumbnail
  );

  if (!url) {
    throw new Error("Redgifs ne fournit pas de video lisible.");
  }

  return {
    id: json.id ?? id,
    url,
    previewUrl: previewUrl ?? "",
    externalUrl: `https://www.redgifs.com/watch/${json.id ?? id}`
  };
}

function rewriteRedgifsMediaUrl(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }
  const match = url.match(/^https:\/\/media\.redgifs\.com\/(.+)$/);
  if (!match) {
    return url;
  }
  const filename = match[1];
  if (import.meta.env.DEV) {
    return `/redgifs-media/${filename}`;
  }
  const workerUrl = import.meta.env.VITE_WORKER_URL?.replace(/\/$/, "");
  const base = workerUrl || "";
  return `${base}/redgifs-media/${filename}`;
}

function fetchWithDevFallback(id: string, signal: AbortSignal): Promise<Response> {
  return fetch(buildRedgifsProxyUrl(id), { signal }).catch((error) => {
    if (!import.meta.env.DEV || !import.meta.env.VITE_WORKER_URL) {
      throw error;
    }

    return fetch(`/redgifs-public/gifs/${encodeURIComponent(id)}`, { signal });
  });
}

function buildRedgifsProxyUrl(id: string): string {
  const workerUrl = import.meta.env.VITE_WORKER_URL?.replace(/\/$/, "");

  if (import.meta.env.DEV && !workerUrl) {
    return `/redgifs-public/gifs/${encodeURIComponent(id)}`;
  }

  const base = workerUrl || window.location.origin;
  const url = new URL(`${base}/redgifs`);
  url.searchParams.set("id", id);
  return url.toString();
}
