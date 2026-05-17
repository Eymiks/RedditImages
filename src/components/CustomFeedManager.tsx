import { ArrowLeft, Layers, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CustomFeed } from "../hooks/useCustomFeeds";
import { normalizeSubreddit } from "../hooks/useFavorites";
import { haptic } from "../utils/haptics";

interface CustomFeedManagerProps {
  feeds: CustomFeed[];
  favorites: string[];
  onClose: () => void;
  onCreate: (name: string, subreddits: string[]) => CustomFeed | null;
  onUpdate: (id: string, patch: { name?: string; subreddits?: string[] }) => void;
  onDelete: (id: string) => void;
  onOpenFeed: (feed: CustomFeed) => void;
}

type Mode = { kind: "list" } | { kind: "edit"; feed: CustomFeed | null };

export function CustomFeedManager({
  feeds,
  favorites,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onOpenFeed
}: CustomFeedManagerProps) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong relative flex max-h-[90vh] w-full max-w-[430px] flex-col rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          {mode.kind === "edit" ? (
            <button
              aria-label="Retour"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
              onClick={() => setMode({ kind: "list" })}
              type="button"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-400/20 text-accent-300">
              <Layers size={18} />
            </span>
          )}
          <h2 className="text-base font-semibold tracking-tight">
            {mode.kind === "edit"
              ? mode.feed
                ? "Modifier le mix"
                : "Nouveau mix"
              : "Mes mix de subreddits"}
          </h2>
          <button
            aria-label="Fermer"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {mode.kind === "list" ? (
          <FeedList
            feeds={feeds}
            onCreate={() => setMode({ kind: "edit", feed: null })}
            onEdit={(feed) => setMode({ kind: "edit", feed })}
            onDelete={onDelete}
            onOpen={(feed) => {
              onOpenFeed(feed);
              onClose();
            }}
          />
        ) : (
          <FeedEditor
            initial={mode.feed}
            favorites={favorites}
            onCancel={() => setMode({ kind: "list" })}
            onSave={(name, subs) => {
              if (mode.feed) {
                onUpdate(mode.feed.id, { name, subreddits: subs });
              } else {
                onCreate(name, subs);
              }
              setMode({ kind: "list" });
              haptic("success");
            }}
          />
        )}
      </div>
    </div>
  );
}

interface FeedListProps {
  feeds: CustomFeed[];
  onCreate: () => void;
  onEdit: (feed: CustomFeed) => void;
  onDelete: (id: string) => void;
  onOpen: (feed: CustomFeed) => void;
}

function FeedList({ feeds, onCreate, onEdit, onDelete, onOpen }: FeedListProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
      <button
        className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-accent-400/40 bg-accent-400/5 px-4 py-3 text-sm font-semibold text-accent-200 transition-colors hover:bg-accent-400/10"
        onClick={onCreate}
        type="button"
      >
        <Plus size={18} />
        Nouveau mix
      </button>

      {feeds.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-sm font-semibold text-white">Pas encore de mix</p>
          <p className="mt-1 text-xs text-moss-100/65">
            Combine plusieurs subreddits en un seul feed pour les parcourir d'un coup.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {feeds.map((feed) => (
            <li key={feed.id} className="glass flex items-center gap-2 rounded-2xl p-2">
              <button
                className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left"
                onClick={() => onOpen(feed)}
                type="button"
              >
                <p className="text-sm font-semibold text-white">{feed.name}</p>
                <p className="mt-0.5 truncate text-xs text-moss-100/65">
                  {feed.subreddits.map((sub) => `r/${sub}`).join(" · ")}
                </p>
              </button>
              <button
                aria-label="Modifier"
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-moss-100/75"
                onClick={() => onEdit(feed)}
                type="button"
              >
                <Layers size={16} />
              </button>
              <button
                aria-label="Supprimer"
                className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/15 text-red-200"
                onClick={() => {
                  onDelete(feed.id);
                  haptic("medium");
                }}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FeedEditorProps {
  initial: CustomFeed | null;
  favorites: string[];
  onCancel: () => void;
  onSave: (name: string, subreddits: string[]) => void;
}

function FeedEditor({ initial, favorites, onCancel, onSave }: FeedEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.subreddits ?? []);
  const [manualInput, setManualInput] = useState("");

  const combined = useMemo(() => {
    const seen = new Set<string>();
    const all: string[] = [];
    for (const sub of [...selected, ...favorites]) {
      const normalized = normalizeSubreddit(sub);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      all.push(normalized);
    }
    return all;
  }, [favorites, selected]);

  const isSelected = (sub: string) => selected.includes(sub);

  const toggle = (sub: string) => {
    const normalized = normalizeSubreddit(sub);
    if (!normalized) return;
    haptic("light");
    setSelected((current) =>
      current.includes(normalized)
        ? current.filter((item) => item !== normalized)
        : [...current, normalized]
    );
  };

  const addManual = () => {
    const parts = manualInput
      .split(/[+,\s]+/)
      .map(normalizeSubreddit)
      .filter(Boolean);
    if (parts.length === 0) return;
    setSelected((current) => {
      const next = [...current];
      for (const sub of parts) {
        if (!next.includes(sub)) next.push(sub);
      }
      return next;
    });
    setManualInput("");
    haptic("light");
  };

  const canSave = name.trim().length > 0 && selected.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-moss-100/55">
          Nom du mix
        </span>
        <input
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none ring-accent-400/60 placeholder:text-moss-100/45 focus:ring-2"
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nature, Photo de rue…"
          value={name}
        />
      </label>

      <div className="mb-3">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-moss-100/55">
          Subreddits ({selected.length})
        </span>
        <div className="flex gap-2">
          <input
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none ring-accent-400/60 placeholder:text-moss-100/45 focus:ring-2"
            inputMode="search"
            onChange={(event) => setManualInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addManual();
              }
            }}
            placeholder="ajouter r/…"
            value={manualInput}
          />
          <button
            className="grid h-11 w-11 place-items-center rounded-xl bg-accent-400 text-moss-950 shadow-glow-accent disabled:opacity-50"
            disabled={!manualInput.trim()}
            onClick={addManual}
            type="button"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-4">
        {combined.length === 0 ? (
          <p className="text-xs text-moss-100/65">Ajoute des favoris pour les retrouver ici en un clic.</p>
        ) : (
          combined.map((sub) => {
            const active = isSelected(sub);
            return (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-accent-400 bg-accent-400 text-moss-950 shadow-glow-accent"
                    : "border-white/10 bg-white/5 text-moss-100/75 hover:bg-white/10"
                }`}
                key={sub}
                onClick={() => toggle(sub)}
                type="button"
              >
                r/{sub}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-auto flex gap-2 pt-3">
        <button
          className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-moss-100/85"
          onClick={onCancel}
          type="button"
        >
          Annuler
        </button>
        <button
          className="h-12 flex-1 rounded-2xl bg-accent-400 text-sm font-bold text-moss-950 shadow-glow-accent disabled:opacity-50"
          disabled={!canSave}
          onClick={() => onSave(name.trim(), selected)}
          type="button"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
