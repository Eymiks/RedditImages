const REDGIFS_API_BASE = "https://api.redgifs.com";
const USER_AGENT = "MyRedditImageApp/1.0";

let tokenCache: { token: string; expiresAt: number } | null = null;

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const id = sanitizeId(url.searchParams.get("id") ?? "");

  if (!id) {
    return json({ error: "Missing Redgifs id" }, 400);
  }

  try {
    const token = await getToken();
    const mediaResponse = await fetch(`${REDGIFS_API_BASE}/v2/gifs/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }
    });

    if (!mediaResponse.ok) {
      return json({ error: "Redgifs request failed" }, mediaResponse.status);
    }

    const mediaJson = await mediaResponse.json() as { gif?: { id?: string; urls?: Record<string, string> } };
    const gif = mediaJson.gif ?? {};

    return new Response(JSON.stringify({
      id: gif.id ?? id,
      urls: {
        hd: gif.urls?.hd,
        sd: gif.urls?.sd,
        poster: gif.urls?.poster,
        thumbnail: gif.urls?.thumbnail,
        vthumbnail: gif.urls?.vthumbnail
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Cache-Control": "public, max-age=300",
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Proxy request failed" }, 502);
  }
}

export const config = { path: "/redgifs" };

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const response = await fetch(`${REDGIFS_API_BASE}/v2/auth/temporary`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT }
  });

  if (!response.ok) {
    throw new Error(`Redgifs auth failed with ${response.status}`);
  }

  const json = await response.json() as { token?: string };
  if (!json.token) {
    throw new Error("Redgifs auth did not return a token");
  }

  tokenCache = { token: json.token, expiresAt: Date.now() + 45 * 60 * 1000 };
  return tokenCache.token;
}

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

function sanitizeId(id: string): string {
  return id.replace(/[^a-z0-9-]/gi, "");
}
