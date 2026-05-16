import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const REDGIFS_API_BASE = "https://api.redgifs.com";
const USER_AGENT = "MyRedditImageApp/1.0";

export default defineConfig({
  server: {
    proxy: {
      "/reddit-public": {
        target: "https://old.reddit.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/reddit-public/, ""),
        headers: {
          "User-Agent": "MyRedditImageApp/1.0",
          Accept: "application/json"
        }
      }
    }
  },
  plugins: [
    redgifsDevProxy(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(i|preview)\.redd\.it\/.*$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "reddit-images",
              expiration: {
                maxEntries: 160,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    })
  ]
});

function redgifsDevProxy(): Plugin {
  let tokenCache: { token: string; expiresAt: number } | null = null;

  async function getTemporaryToken(): Promise<string> {
    if (tokenCache && Date.now() < tokenCache.expiresAt) {
      return tokenCache.token;
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

    const json = (await response.json()) as { token?: string };
    if (!json.token) {
      throw new Error("Redgifs auth did not return a token");
    }

    tokenCache = {
      token: json.token,
      expiresAt: Date.now() + 45 * 60 * 1000
    };
    return json.token;
  }

  async function handleRedgifsRequest(request: IncomingMessage, response: JsonResponse) {
    const id = decodeURIComponent(request.url?.replace(/^\/redgifs-public\/gifs\//, "") ?? "")
      .split(/[?#]/)[0]
      .replace(/[^a-z0-9-]/gi, "");

    if (!id) {
      sendJson(response, 400, { error: "Missing Redgifs id" });
      return;
    }

    try {
      const token = await getTemporaryToken();
      const redgifsResponse = await fetch(`${REDGIFS_API_BASE}/v2/gifs/${encodeURIComponent(id)}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT
        }
      });

      if (!redgifsResponse.ok) {
        sendJson(response, redgifsResponse.status, { error: "Redgifs request failed" });
        return;
      }

      const json = (await redgifsResponse.json()) as {
        gif?: {
          id?: string;
          urls?: {
            hd?: string;
            sd?: string;
            poster?: string;
            thumbnail?: string;
            vthumbnail?: string;
          };
        };
      };

      sendJson(response, 200, {
        id: json.gif?.id ?? id,
        urls: {
          hd: json.gif?.urls?.hd,
          sd: json.gif?.urls?.sd,
          poster: json.gif?.urls?.poster,
          thumbnail: json.gif?.urls?.thumbnail,
          vthumbnail: json.gif?.urls?.vthumbnail
        }
      });
    } catch (error) {
      sendJson(response, 502, {
        error: error instanceof Error ? error.message : "Redgifs proxy failed"
      });
    }
  }

  return {
    name: "redgifs-dev-proxy",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith("/redgifs-public/gifs/")) {
          next();
          return;
        }

        void handleRedgifsRequest(request, response);
      });
    }
  };
}

type JsonResponse = ServerResponse;

function sendJson(response: JsonResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": status === 200 ? "public, max-age=300" : "no-store"
  });
  response.end(JSON.stringify(body));
}
