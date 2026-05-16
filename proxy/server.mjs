import http from "node:http";

const PORT = Number(process.env.PORT ?? 8787);
const REDDIT_ORIGIN = "https://old.reddit.com";
const REDGIFS_API_BASE = "https://api.redgifs.com";
const USER_AGENT = "MyRedditImageApp/1.0 by local-proxy";
const redditCache = new Map();
let redgifsTokenCache = null;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    send(response, 204, "", corsHeaders());
    return;
  }

  try {
    if (url.pathname === "/health") {
      sendJson(response, 200, { ok: true }, "no-store");
      return;
    }

    if (url.pathname === "/reddit") {
      await handleReddit(url, response);
      return;
    }

    if (url.pathname === "/redgifs") {
      await handleRedgifs(url, response);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : "Proxy request failed"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Reddit image proxy listening on http://127.0.0.1:${PORT}`);
});

async function handleReddit(url, response) {
  const target = url.searchParams.get("url");
  if (!target) {
    sendJson(response, 400, { error: "Missing url parameter" });
    return;
  }

  const redditUrl = new URL(target);
  if (redditUrl.origin !== REDDIT_ORIGIN || !redditUrl.pathname.endsWith(".json")) {
    sendJson(response, 400, { error: "Only reddit JSON listing URLs are allowed" });
    return;
  }

  const cacheKey = redditUrl.toString();
  const redditResponse = await fetch(redditUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });

  const contentType = redditResponse.headers.get("Content-Type") ?? "";
  const body = await redditResponse.text();

  if (redditResponse.ok && contentType.includes("application/json")) {
    redditCache.set(cacheKey, { body, savedAt: Date.now() });
    pruneCache(redditCache, 100);
    send(response, 200, body, {
      "Cache-Control": "public, max-age=120",
      "Content-Type": "application/json",
      "X-Proxy-Cache": "miss"
    });
    return;
  }

  const cached = redditCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < 1000 * 60 * 60 * 6) {
    send(response, 200, cached.body, {
      "Cache-Control": "public, max-age=60",
      "Content-Type": "application/json",
      "X-Proxy-Cache": "stale"
    });
    return;
  }

  if (!contentType.includes("application/json")) {
    sendJson(response, 502, {
      error:
        "Reddit bloque ce proxy avec sa page network security. Essaie un autre hebergeur/proxy ou un cache deja chaud."
    });
    return;
  }

  send(response, redditResponse.status, body, {
    "Cache-Control": "no-store",
    "Content-Type": contentType || "application/json"
  });
}

async function handleRedgifs(url, response) {
  const id = sanitizeId(url.searchParams.get("id") ?? "");
  if (!id) {
    sendJson(response, 400, { error: "Missing Redgifs id" });
    return;
  }

  const token = await getRedgifsToken();
  const mediaResponse = await fetch(`${REDGIFS_API_BASE}/v2/gifs/${encodeURIComponent(id)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT
    }
  });

  if (!mediaResponse.ok) {
    sendJson(response, mediaResponse.status, { error: "Redgifs request failed" });
    return;
  }

  const mediaJson = await mediaResponse.json();
  const gif = mediaJson.gif ?? {};
  sendJson(
    response,
    200,
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
    "public, max-age=300"
  );
}

async function getRedgifsToken() {
  if (redgifsTokenCache && Date.now() < redgifsTokenCache.expiresAt) {
    return redgifsTokenCache.token;
  }

  const response = await fetch(`${REDGIFS_API_BASE}/v2/auth/temporary`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`Redgifs auth failed with ${response.status}`);
  }

  const json = await response.json();
  if (!json.token) {
    throw new Error("Redgifs auth did not return a token");
  }

  redgifsTokenCache = {
    token: json.token,
    expiresAt: Date.now() + 45 * 60 * 1000
  };
  return json.token;
}

function sendJson(response, status, body, cacheControl = "no-store") {
  send(response, status, JSON.stringify(body), {
    "Cache-Control": cacheControl,
    "Content-Type": "application/json"
  });
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    ...corsHeaders(),
    ...headers
  });
  response.end(body);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function sanitizeId(id) {
  return id.replace(/[^a-z0-9-]/gi, "");
}

function pruneCache(cache, maxEntries) {
  if (cache.size <= maxEntries) {
    return;
  }

  [...cache.entries()]
    .sort((a, b) => a[1].savedAt - b[1].savedAt)
    .slice(0, cache.size - maxEntries)
    .forEach(([key]) => cache.delete(key));
}
