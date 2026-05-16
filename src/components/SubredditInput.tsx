import { Search, Star } from "lucide-react";
import { useEffect, useState } from "react";

interface SubredditInputProps {
  value: string;
  isFavorite: boolean;
  onSubmit: (name: string) => void;
  onToggleFavorite: () => void;
}

export function SubredditInput({
  value,
  isFavorite,
  onSubmit,
  onToggleFavorite
}: SubredditInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-moss-100/50" size={18} />
        <input
          className="h-12 w-full rounded-lg border border-white/10 bg-white/8 px-10 text-base text-white outline-none ring-moss-400/70 placeholder:text-moss-100/45 focus:ring-2"
          inputMode="search"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Subreddit"
          value={draft}
        />
      </label>
      <button
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border ${
          isFavorite
            ? "border-yellow-300/40 bg-yellow-300/20 text-yellow-200"
            : "border-white/10 bg-white/8 text-moss-100/70"
        }`}
        onClick={onToggleFavorite}
        type="button"
      >
        <Star fill={isFavorite ? "currentColor" : "none"} size={19} />
      </button>
    </form>
  );
}
