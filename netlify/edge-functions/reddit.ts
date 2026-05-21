const REDDIT_ORIGIN = "https://old.reddit.com";
const USER_AGENT = "MyRedditImageApp/1.0";
const redditCache = new Map<string, { body: string; savedAt: number }>();

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return json({ error: "Missing url parameter" }, 400);
  }

  let redditUrl: URL;
  try {
    redditUrl = new URL(target);
  } catch {
    return json({ error: "Invalid url parameter" }, 400);
  }

  if (redditUrl.origin !== REDDIT_ORIGIN || !redditUrl.pathname.endsWith(".json")) {
    return json({ error: "Only reddit JSON listing URLs are allowed" }, 400);
  }

  const cacheKey = redditUrl.toString();

  try {
    const response = await fetch(redditUrl, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT }
    });

    const contentType = response.headers.get("Content-Type") ?? "";
    const body = await response.text();

    if (response.ok && contentType.includes("application/json")) {
      redditCache.set(cacheKey, { body, savedAt: Date.now() });
      pruneCache();
      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Cache-Control": "public, max-age=120",
          "Content-Type": "application/json",
          "X-Proxy-Cache": "miss"
        }
      });
    }

    if (response.status === 429) {
      const cached = redditCache.get(cacheKey);
      if (cached && Date.now() - cached.savedAt < 1000 * 60 * 60 * 6) {
        return new Response(cached.body, {
          status: 200,
          headers: {
            ...corsHeaders(),
            "Cache-Control": "public, max-age=60",
            "Content-Type": "application/json",
            "X-Proxy-Cache": "stale"
          }
        });
      }
    }

    if (!contentType.includes("application/json")) {
      return json(
        { error: "Reddit bloque ce proxy avec sa page network security. Essaie un autre hebergeur/proxy ou un cache deja chaud." },
        502
      );
    }

    return new Response(body, {
      status: response.status,
      headers: {
        ...corsHeaders(),
        "Cache-Control": "no-store",
        "Content-Type": contentType || "application/json"
      }
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Proxy request failed" }, 502);
  }
}

export const config = { path: "/reddit" };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Cache-Control": "no-store", "Content-Type": "application/json" }
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function pruneCache() {
  if (redditCache.size <= 100) return;
  [...redditCache.entries()]
    .sort((a, b) => a[1].savedAt - b[1].savedAt)
    .slice(0, redditCache.size - 100)
    .forEach(([key]) => redditCache.delete(key));
}
