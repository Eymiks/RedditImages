import { FolderHeart, Grid2X2 } from "lucide-react";
import type { ReactNode } from "react";
import type { FeedTab } from "../types/reddit";

interface FeedSelectorProps {
  activeTab: FeedTab;
  favorites: string[];
  selectedSubreddit: string;
  onTabChange: (tab: FeedTab) => void;
  onSelectFavorite: (name: string) => void;
}

export function FeedSelector({
  activeTab,
  favorites,
  selectedSubreddit,
  onTabChange,
  onSelectFavorite
}: FeedSelectorProps) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1">
        <TabButton active={activeTab === "subreddits"} icon={<Grid2X2 size={16} />} label="Sub" onClick={() => onTabChange("subreddits")} />
        <TabButton active={activeTab === "favorites"} icon={<FolderHeart size={16} />} label="Favoris" onClick={() => onTabChange("favorites")} />
      </div>

      {activeTab === "favorites" ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {favorites.length === 0 ? (
            <p className="text-sm text-moss-100/65">Aucun favori.</p>
          ) : (
            favorites.map((favorite) => (
              <button
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
                  selectedSubreddit === favorite
                    ? "border-moss-100 bg-moss-100 text-moss-950"
                    : "border-white/10 bg-white/5 text-moss-100/75"
                }`}
                key={favorite}
                onClick={() => onSelectFavorite(favorite)}
                type="button"
              >
                r/{favorite}
              </button>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

interface TabButtonProps {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

function TabButton({ active, disabled, icon, label, onClick }: TabButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-semibold ${
        active ? "bg-moss-100 text-moss-950" : "text-moss-100/72"
      } ${disabled ? "opacity-45" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
