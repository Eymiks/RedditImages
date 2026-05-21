import { History, Search, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchSubredditSuggestions, type SubredditSuggestion } from "../api/redditAutocomplete";
import { normalizeSubreddit } from "../hooks/useFavorites";
import { haptic } from "../utils/haptics";

interface SubredditInputProps {
  value: string;
  isFavorite: boolean;
  recent: string[];
  autoFocus?: boolean;
  onSubmit: (name: string) => void;
  onToggleFavorite: () => void;
}

export function SubredditInput({
  value,
  isFavorite,
  recent,
  autoFocus,
  onSubmit,
  onToggleFavorite
}: SubredditInputProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const showDropdown = focused && (suggestions.length > 0 || (draft.trim().length < 2 && recent.length > 0));

  return (
    <div ref={containerRef} className="relative">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={18} />
          <input
            autoFocus={autoFocus}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.08] pl-10 pr-10 text-base text-white outline-none ring-accent-400/60 placeholder:text-white/35 focus:ring-2"
            inputMode="search"
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Subreddit"
            value={draft}
          />
          {draft ? (
            <button
              aria-label="Effacer"
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/75"
              onClick={() => {
                setDraft("");
                setSuggestions([]);
              }}
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
        <button
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition-all ${
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

      {showDropdown ? (
        <div className="glass-strong absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl p-2 shadow-glow-accent animate-fade-in">
          {suggestions.length > 0 ? (
            <ul className="space-y-1">
              {suggestions.map((suggestion) => (
                <li key={suggestion.name}>
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10"
                    onClick={() => submit(suggestion.name)}
                    type="button"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-400/15 text-xs font-bold text-accent-300">
                      {suggestion.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">r/{suggestion.name}</p>
                      <p className="truncate text-xs text-white/55">
                        {formatSubscribers(suggestion.subscribers)} membres
                      </p>
                    </span>
                    {suggestion.nsfw ? (
                      <span className="rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white">NSFW</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : draft.trim().length < 2 && recent.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/45">
                <History size={14} />
                Récents
              </div>
              <ul className="space-y-0.5">
                {recent.map((name) => (
                  <li key={name}>
                    <button
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10"
                      onClick={() => submit(name)}
                      type="button"
                    >
                      r/{name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {loading ? (
            <p className="px-2 py-2 text-xs text-white/45">Recherche…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatSubscribers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}
