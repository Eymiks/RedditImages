import { X } from "lucide-react";
import { useEffect } from "react";
import { SubredditInput } from "./SubredditInput";

interface SearchModalProps {
  favorites: string[];
  isFavorite: boolean;
  recent: string[];
  value: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  onToggleFavorite: () => void;
}

export function SearchModal({
  favorites,
  isFavorite,
  recent,
  value,
  onClose,
  onSubmit,
  onToggleFavorite
}: SearchModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (name: string) => {
    onSubmit(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative mx-2 mb-3 flex h-[min(78vh,620px)] flex-col rounded-[1.75rem] border border-white/[0.13] bg-surface-900/90 shadow-[0_24px_70px_rgba(0,0,0,0.72)] backdrop-blur-2xl animate-slide-up safe-bottom">
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-white/18" aria-hidden />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-300/80">
              Recherche
            </p>
            <p className="mt-1 truncate text-lg font-extrabold tracking-tight text-white">
              r/{value}
            </p>
          </div>
          <button
            aria-label="Fermer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-white/70 transition-colors active:bg-white/15"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
          <SubredditInput
            autoFocus
            favoriteOptions={favorites}
            isFavorite={isFavorite}
            onSelectShortcut={handleSubmit}
            onSubmit={handleSubmit}
            onToggleFavorite={onToggleFavorite}
            recent={recent}
            value={value}
          />
        </div>
      </div>
    </div>
  );
}
