import { useCallback, useEffect, useState } from "react";
import type { FeedTab, SortName, TopPeriod } from "../types/reddit";

const STORAGE_KEY = "reddit-image-pwa:settings";

const VALID_TABS: FeedTab[] = ["subreddits", "favorites", "multi", "saved"];
const VALID_SORTS: SortName[] = ["hot", "new", "top"];
const VALID_PERIODS: TopPeriod[] = ["day", "week", "month", "year", "all"];

export interface Settings {
  nsfw: boolean;
  autoplay: boolean;
  viewerMuted: boolean;
  defaultTab: FeedTab;
  sort: SortName;
  period: TopPeriod;
}

const DEFAULTS: Settings = {
  nsfw: false,
  autoplay: true,
  viewerMuted: true,
  defaultTab: "subreddits",
  sort: "hot",
  period: "week"
};

function readSettings(): Settings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw);
    return {
      nsfw: typeof parsed.nsfw === "boolean" ? parsed.nsfw : DEFAULTS.nsfw,
      autoplay: typeof parsed.autoplay === "boolean" ? parsed.autoplay : DEFAULTS.autoplay,
      viewerMuted:
        typeof parsed.viewerMuted === "boolean" ? parsed.viewerMuted : DEFAULTS.viewerMuted,
      defaultTab: VALID_TABS.includes(parsed.defaultTab) ? parsed.defaultTab : DEFAULTS.defaultTab,
      sort: VALID_SORTS.includes(parsed.sort) ? parsed.sort : DEFAULTS.sort,
      period: VALID_PERIODS.includes(parsed.period) ? parsed.period : DEFAULTS.period
    };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => readSettings());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const replace = useCallback((nextSettings: Settings) => {
    setSettings(nextSettings);
  }, []);

  const toggle = useCallback((key: keyof Settings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  return { settings, set, replace, toggle };
}
