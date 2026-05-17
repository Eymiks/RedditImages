import { Plus } from "lucide-react";
import type { CustomFeed } from "../hooks/useCustomFeeds";
import { haptic } from "../utils/haptics";

interface FavoritesStripProps {
  favorites: string[];
  selectedSubreddit: string;
  onSelect: (name: string) => void;
}

export function FavoritesStrip({ favorites, selectedSubreddit, onSelect }: FavoritesStripProps) {
  if (favorites.length === 0) {
    return (
      <p className="px-1 text-sm text-moss-100/65">
        Aucun favori. Tap sur l'étoile à droite du champ pour en ajouter.
      </p>
    );
  }
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 animate-fade-in">
      {favorites.map((favorite) => {
        const active = selectedSubreddit === favorite;
        return (
          <button
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition-all ${
              active ? "chip-active" : "chip-idle"
            }`}
            key={favorite}
            onClick={() => {
              haptic("light");
              onSelect(favorite);
            }}
            type="button"
          >
            r/{favorite}
          </button>
        );
      })}
    </div>
  );
}

interface CustomFeedsStripProps {
  feeds: CustomFeed[];
  selectedFeedId: string | null;
  onSelect: (feed: CustomFeed) => void;
  onOpenManager: () => void;
}

export function CustomFeedsStrip({
  feeds,
  selectedFeedId,
  onSelect,
  onOpenManager
}: CustomFeedsStripProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 animate-fade-in">
      {feeds.map((feed) => {
        const active = selectedFeedId === feed.id;
        return (
          <button
            className={`group shrink-0 rounded-2xl px-4 py-2 text-left transition-all ${
              active ? "chip-active" : "chip-idle"
            }`}
            key={feed.id}
            onClick={() => {
              haptic("light");
              onSelect(feed);
            }}
            type="button"
          >
            <p className="text-sm font-semibold">{feed.name}</p>
            <p
              className={`text-[10px] uppercase tracking-wider ${
                active ? "text-moss-950/70" : "text-moss-100/55"
              }`}
            >
              {feed.subreddits.length} sub{feed.subreddits.length > 1 ? "s" : ""}
            </p>
          </button>
        );
      })}
      <button
        className="shrink-0 rounded-2xl border border-dashed border-accent-400/40 bg-accent-400/5 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/10"
        onClick={() => {
          haptic("light");
          onOpenManager();
        }}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <Plus size={15} />
          {feeds.length === 0 ? "Créer un mix" : "Gérer"}
        </span>
      </button>
    </div>
  );
}
