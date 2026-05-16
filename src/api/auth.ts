import type { AuthSession } from "../types/reddit";

const REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/authorize";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const STORAGE_PREFIX = "reddit-image-pwa";
const VERIFIER_KEY = `${STORAGE_PREFIX}:pkce-verifier`;
const STATE_KEY = `${STORAGE_PREFIX}:oauth-state`;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface MeResponse {
  name: string;
  icon_img?: string;
  snoovatar_img?: string;
}

export async function startLogin(): Promise<void> {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  const state = crypto.randomUUID();

  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);

  const url = new URL(REDDIT_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("duration", "permanent");
  url.searchParams.set("scope", "identity read mysubreddits");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  window.location.assign(url.toString());
}

export function hasRedditClientId(): boolean {
  return Boolean(import.meta.env.VITE_REDDIT_CLIENT_ID);
}

export async function finishLoginFromCallback(search: string): Promise<AuthSession> {
  const params = new URLSearchParams(search);
  const error = params.get("error");
  if (error) {
    throw new Error(`Connexion refusee: ${error}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const savedState = localStorage.getItem(STATE_KEY);
  const verifier = localStorage.getItem(VERIFIER_KEY);

  if (!code || !state || state !== savedState || !verifier) {
    throw new Error("Callback OAuth invalide.");
  }

  const token = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier
  });

  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);

  return buildSession(token);
}

export async function refreshSession(session: AuthSession): Promise<AuthSession> {
  if (!session.refreshToken) {
    throw new Error("Aucun refresh token disponible.");
  }

  const token = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken
  });

  const refreshed = await buildSession({
    ...token,
    refresh_token: token.refresh_token ?? session.refreshToken
  });

  return refreshed;
}

export function shouldRefresh(session: AuthSession): boolean {
  return Date.now() > session.expiresAt - 60_000;
}

async function buildSession(token: TokenResponse): Promise<AuthSession> {
  const me = await fetchMe(token.access_token);
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresAt: Date.now() + token.expires_in * 1000,
    username: me.name,
    avatarUrl: cleanAvatar(me.snoovatar_img || me.icon_img || null)
  };
}

async function exchangeToken(body: Record<string, string>): Promise<TokenResponse> {
  const clientId = getClientId();
  const form = new URLSearchParams(body);
  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:`)}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(`Echange OAuth impossible (${response.status}).`);
  }

  return (await response.json()) as TokenResponse;
}

async function fetchMe(accessToken: string): Promise<MeResponse> {
  const response = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Impossible de charger le profil Reddit.");
  }

  return (await response.json()) as MeResponse;
}

function getClientId(): string {
  const clientId = import.meta.env.VITE_REDDIT_CLIENT_ID;
  if (!clientId) {
    throw new Error("VITE_REDDIT_CLIENT_ID est manquant.");
  }
  return clientId;
}

function getRedirectUri(): string {
  return `${window.location.origin}/callback`;
}

function createCodeVerifier(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function cleanAvatar(url: string | null): string | null {
  return url ? url.replaceAll("&amp;", "&") : null;
}
