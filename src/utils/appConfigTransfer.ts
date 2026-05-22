import type { CustomFeed } from "../hooks/useCustomFeeds";
import type { Settings } from "../hooks/useSettings";
import type { FeedTab, SortName, TopPeriod } from "../types/reddit";

const APP_ID = "reddit-image-pwa";
const CONFIG_VERSION = 1;
const VALID_TABS: FeedTab[] = ["subreddits", "favorites", "multi", "saved"];
const VALID_SORTS: SortName[] = ["hot", "new", "top"];
const VALID_PERIODS: TopPeriod[] = ["day", "week", "month", "year", "all"];

const DEFAULT_SETTINGS: Settings = {
  nsfw: false,
  autoplay: true,
  viewerMuted: true,
  defaultTab: "subreddits",
  sort: "hot",
  period: "week"
};

export interface AppConfigExportV1 {
  app: typeof APP_ID;
  version: typeof CONFIG_VERSION;
  exportedAt: string;
  settings: Settings;
  favorites: string[];
  customFeeds: CustomFeed[];
}

export interface ParsedAppConfig {
  settings: Settings;
  favorites: string[];
  customFeeds: CustomFeed[];
}

interface ConfigInput {
  settings: Settings;
  favorites: string[];
  customFeeds: CustomFeed[];
}

export function createAppConfigExport(input: ConfigInput): AppConfigExportV1 {
  return {
    app: APP_ID,
    version: CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    settings: sanitizeSettings(input.settings),
    favorites: sanitizeFavorites(input.favorites),
    customFeeds: sanitizeCustomFeeds(input.customFeeds)
  };
}

export function parseAppConfigText(text: string): ParsedAppConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON invalide.");
  }

  if (!isRecord(parsed) || parsed.app !== APP_ID) {
    throw new Error("Ce fichier ne correspond pas a cette application.");
  }

  if (parsed.version !== CONFIG_VERSION) {
    throw new Error("Version de configuration non supportee.");
  }

  return {
    settings: sanitizeSettings(isRecord(parsed.settings) ? parsed.settings : {}),
    favorites: sanitizeFavorites(Array.isArray(parsed.favorites) ? parsed.favorites : []),
    customFeeds: sanitizeCustomFeeds(
      Array.isArray(parsed.customFeeds) ? parsed.customFeeds : []
    )
  };
}

export function stringifyAppConfig(config: AppConfigExportV1): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

export function createAppConfigFilename(date = new Date()): string {
  return `reddit-image-pwa-config-${date.toISOString().slice(0, 10)}.json`;
}

function sanitizeSettings(raw: unknown): Settings {
  const input = isRecord(raw) ? raw : {};
  return {
    nsfw: typeof input.nsfw === "boolean" ? input.nsfw : DEFAULT_SETTINGS.nsfw,
    autoplay: typeof input.autoplay === "boolean" ? input.autoplay : DEFAULT_SETTINGS.autoplay,
    viewerMuted:
      typeof input.viewerMuted === "boolean" ? input.viewerMuted : DEFAULT_SETTINGS.viewerMuted,
    defaultTab: isValidTab(input.defaultTab) ? input.defaultTab : DEFAULT_SETTINGS.defaultTab,
    sort: isValidSort(input.sort) ? input.sort : DEFAULT_SETTINGS.sort,
    period: isValidPeriod(input.period) ? input.period : DEFAULT_SETTINGS.period
  };
}

function sanitizeFavorites(raw: unknown[]): string[] {
  return uniqueSubreddits(raw).sort();
}

function sanitizeCustomFeeds(raw: unknown[]): CustomFeed[] {
  return raw
    .map((item): CustomFeed | null => {
      if (!isRecord(item)) return null;
      const id = typeof item.id === "string" ? item.id.trim().slice(0, 80) : "";
      const name = typeof item.name === "string" ? item.name.trim().slice(0, 40) : "";
      const subreddits = Array.isArray(item.subreddits) ? uniqueSubreddits(item.subreddits) : [];
      if (!id || !name || subreddits.length === 0) return null;
      return {
        id,
        name,
        subreddits,
        createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now()
      };
    })
    .filter((feed): feed is CustomFeed => feed !== null);
}

function uniqueSubreddits(raw: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const normalized = normalizeSubreddit(String(item));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function normalizeSubreddit(name: string): string {
  return name.trim().replace(/^r\//i, "").replace(/^\/r\//i, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidTab(value: unknown): value is FeedTab {
  return VALID_TABS.includes(value as FeedTab);
}

function isValidSort(value: unknown): value is SortName {
  return VALID_SORTS.includes(value as SortName);
}

function isValidPeriod(value: unknown): value is TopPeriod {
  return VALID_PERIODS.includes(value as TopPeriod);
}
