const REDGIFS_MEDIA_BASE = "https://media.redgifs.com";
const REDGIFS_MEDIA_FILENAME = /^[A-Za-z0-9-]+(?:\.(?:mp4|m4v|webm|jpg|jpeg|webp|png))$/;
const USER_AGENT = "MyRedditImageApp/1.0";

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const filename = decodeURIComponent(url.pathname.replace(/^\/redgifs-media\//, ""));

  if (!REDGIFS_MEDIA_FILENAME.test(filename)) {
    return new Response("Invalid Redgifs filename", {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "text/plain" }
    });
  }

  const upstreamHeaders: Record<string, string> = { "User-Agent": USER_AGENT };
  const range = request.headers.get("Range");
  if (range) {
    upstreamHeaders["Range"] = range;
  }

  try {
    const upstream = await fetch(`${REDGIFS_MEDIA_BASE}/${filename}`, { headers: upstreamHeaders });

    const responseHeaders: Record<string, string> = {
      ...corsHeaders(),
      "Accept-Ranges": "bytes",
      "Cache-Control": upstream.ok ? "public, max-age=3600" : "no-store",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges"
    };

    for (const header of ["content-type", "content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders[header] = value;
    }

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Media proxy failed" }), {
      status: 502,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }
}

export const config = { path: "/redgifs-media/*" };

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range"
  };
}
