import { History, Search, Sparkles, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchSubredditSuggestions, type SubredditSuggestion } from "../api/redditAutocomplete";
import { normalizeSubreddit } from "../hooks/useFavorites";
import { haptic } from "../utils/haptics";
import { buildSearchShortcuts } from "./searchShortcuts";

interface SubredditInputProps {
  value: string;
  isFavorite: boolean;
  recent: string[];
  favoriteOptions?: string[];
  autoFocus?: boolean;
  onSelectShortcut?: (name: string) => void;
  onSubmit: (name: string) => void;
  onToggleFavorite: () => void;
}

export function SubredditInput({
  value,
  isFavorite,
  recent,
  favoriteOptions = [],
  autoFocus,
  onSelectShortcut,
  onSubmit,
  onToggleFavorite
}: SubredditInputProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(Boolean(autoFocus));
  const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const shortcuts = useMemo(
    () =>
      buildSearchShortcuts({
        current: value,
        favorites: favoriteOptions,
        recent
      }),
    [favoriteOptions, recent, value]
  );

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const result = await fetchSubredditSuggestions(trimmed, controller.signal);
      if (!controller.signal.aborted) {
        setSuggestions(result);
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    const onPointer = (event: Event) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, []);

  const submit = (raw: string) => {
    const normalized = normalizeSubreddit(raw);
    if (!normalized) return;
    haptic("light");
    onSubmit(normalized);
    setFocused(false);
  };

  const selectShortcut = (name: string) => {
    const normalized = normalizeSubreddit(name);
    if (!normalized) return;
    haptic("light");
    (onSelectShortcut ?? onSubmit)(normalized);
    setFocused(false);
  };

  const trimmedDraft = draft.trim();
  const showSuggestions = focused && trimmedDraft.length >= 2;
  const showShortcuts = focused && trimmedDraft.length < 2;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      submit(suggestions[activeIndex].name);
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            submit(suggestions[activeIndex].name);
          } else {
            submit(draft);
          }
        }}
      >
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={18} />
          <input
            autoFocus={autoFocus}
            className="h-[52px] w-full rounded-2xl border border-white/10 bg-white/[0.09] pl-10 pr-11 text-base font-semibold text-white outline-none ring-accent-400/60 placeholder:text-white/35 focus:border-accent-300/50 focus:ring-2"
            inputMode="search"
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Subreddit"
            value={draft}
          />
          {draft ? (
            <button
              aria-label="Effacer"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/75 transition-colors active:bg-white/15"
              onClick={() => {
                setDraft("");
                setSuggestions([]);
                setFocused(true);
              }}
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
        <button
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border transition-all ${
            isFavorite
              ? "border-yellow-300/50 bg-yellow-300/15 text-yellow-200 shadow-[0_0_20px_-6px_rgba(253,224,71,0.6)]"
              : "border-white/10 bg-white/[0.08] text-white/60"
          }`}
          onClick={() => {
            haptic("light");
            onToggleFavorite();
          }}
          type="button"
        >
          <Star fill={isFavorite ? "currentColor" : "none"} size={19} />
        </button>
      </form>

      {showShortcuts ? (
        <div className="space-y-4 animate-fade-in">
          {shortcuts.favorites.length > 0 ? (
            <section>
              <SectionLabel icon={<Star size={14} fill="currentColor" />} label="Favoris" />
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {shortcuts.favorites.map((name) => (
                  <button
                    className="inline-flex min-h-10 max-w-[150px] shrink-0 items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/[0.08] px-3 text-sm font-bold text-yellow-100 transition-colors active:bg-yellow-300/15"
                    key={name}
                    onClick={() => selectShortcut(name)}
                    type="button"
                  >
                    <Star size={13} fill="currentColor" />
                    <span className="truncate">r/{name}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {shortcuts.recent.length > 0 ? (
            <section>
              <SectionLabel icon={<History size={14} />} label="Récents" />
              <ul className="space-y-1">
                {shortcuts.recent.map((name) => (
                  <li key={name}>
                    <button
                      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.045] px-3 text-left transition-colors active:bg-white/[0.08]"
                      onClick={() => selectShortcut(name)}
                      type="button"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-white/50">
                        <History size={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">
                        r/{name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {showSuggestions ? (
        <section className="animate-fade-in">
          <SectionLabel icon={<Sparkles size={14} />} label="Suggestions" />
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-2">
            {suggestions.length > 0 ? (
              <ul ref={listRef} className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.name}>
                    <button
                      data-index={index}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                        index === activeIndex ? "bg-accent-400/15" : "active:bg-white/10"
                      }`}
                      onClick={() => submit(suggestion.name)}
                      type="button"
                    >
                      <SubredditIcon iconUrl={suggestion.iconUrl} name={suggestion.name} />
                      <span className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          r/{highlightMatch(suggestion.name, trimmedDraft)}
                        </p>
                        <p className="truncate text-xs text-white/55">
                          {formatSubscribers(suggestion.subscribers)} membres
                          {suggestion.activeUsers > 0
                            ? ` · ${formatSubscribers(suggestion.activeUsers)} en ligne`
                            : null}
                        </p>
                      </span>
                      {suggestion.nsfw ? (
                        <span className="shrink-0 rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white">
                          NSFW
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-3 text-sm text-white/45">
                {loading ? "Recherche…" : "Aucune suggestion pour l'instant"}
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SubredditIcon({ iconUrl, name }: { iconUrl: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);
  if (iconUrl && !imgError) {
    return (
      <img
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        onError={() => setImgError(true)}
        src={iconUrl}
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-400/15 text-xs font-bold text-accent-300">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/42">
      {icon}
      {label}
    </div>
  );
}

function formatSubscribers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

function highlightMatch(text: string, query: string): ReactNode {
  const lower = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lower.indexOf(lowerQuery);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-bold text-accent-300">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}
