const REDDIT_ORIGIN = "https://www.reddit.com";
const REDGIFS_API_BASE = "https://api.redgifs.com";
const USER_AGENT = "MyRedditImageApp/1.0";
const redditMemoryCache = new Map();

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/reddit") {
      return handleReddit(url);
    }

    if (url.pathname === "/redgifs") {
      return handleRedgifs(url);
    }

    return json({ error: "Not found" }, 404);
  }
};

async function handleReddit(url) {
  const target = url.searchParams.get("url");
  if (!target) {
    return json({ error: "Missing url parameter" }, 400);
  }

  const redditUrl = new URL(target);
  if (redditUrl.origin !== REDDIT_ORIGIN || !redditUrl.pathname.endsWith(".json")) {
    return json({ error: "Only reddit JSON listing URLs are allowed" }, 400);
  }

  const response = await fetch(redditUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });

  if (response.status === 429) {
    const cached = redditMemoryCache.get(redditUrl.toString());
    if (cached && Date.now() - cached.savedAt < 1000 * 60 * 60 * 6) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Cache-Control": "public, max-age=60",
          "Content-Type": "application/json",
          "X-Reddit-Cache": "stale"
        }
      });
    }
  }

  const responseBody = await response.text();
  const contentType = response.headers.get("Content-Type") ?? "";

  if (response.ok) {
    if (!contentType.includes("application/json")) {
      return json(
        { error: "Reddit blocked this proxy host or returned a non-JSON security page" },
        502
      );
    }

    redditMemoryCache.set(redditUrl.toString(), {
      savedAt: Date.now(),
      body: responseBody
    });
    pruneRedditCache();
  }

  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...corsHeaders(),
      "Cache-Control": response.ok ? "public, max-age=120" : "no-store",
      "Content-Type": contentType || "application/json"
    }
  });
}

async function handleRedgifs(url) {
  const id = sanitizeId(url.searchParams.get("id") ?? "");
  if (!id) {
    return json({ error: "Missing Redgifs id" }, 400);
  }

  const tokenResponse = await fetch(`${REDGIFS_API_BASE}/v2/auth/temporary`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });

  if (!tokenResponse.ok) {
    return json({ error: "Redgifs auth failed" }, tokenResponse.status);
  }

  const tokenJson = await tokenResponse.json();
  if (!tokenJson.token) {
    return json({ error: "Redgifs auth did not return a token" }, 502);
  }

  const mediaResponse = await fetch(`${REDGIFS_API_BASE}/v2/gifs/${encodeURIComponent(id)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${tokenJson.token}`,
      "User-Agent": USER_AGENT
    }
  });

  if (!mediaResponse.ok) {
    return json({ error: "Redgifs request failed" }, mediaResponse.status);
  }

  const mediaJson = await mediaResponse.json();
  const gif = mediaJson.gif ?? {};

  return json(
    {
      id: gif.id ?? id,
      urls: {
        hd: gif.urls?.hd,
        sd: gif.urls?.sd,
        poster: gif.urls?.poster,
        thumbnail: gif.urls?.thumbnail,
        vthumbnail: gif.urls?.vthumbnail
      }
    },
    200,
    "public, max-age=300"
  );
}

function json(body, status, cacheControl = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "Cache-Control": cacheControl,
      "Content-Type": "application/json"
    }
  });
}

function sanitizeId(id) {
  return id.replace(/[^a-z0-9-]/gi, "");
}

function pruneRedditCache() {
  if (redditMemoryCache.size <= 100) {
    return;
  }

  const oldestKeys = [...redditMemoryCache.entries()]
    .sort((a, b) => a[1].savedAt - b[1].savedAt)
    .slice(0, redditMemoryCache.size - 100)
    .map(([key]) => key);

  oldestKeys.forEach((key) => redditMemoryCache.delete(key));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
