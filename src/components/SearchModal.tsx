import { X } from "lucide-react";
import { useEffect } from "react";
import { SubredditInput } from "./SubredditInput";

interface SearchModalProps {
  isFavorite: boolean;
  recent: string[];
  value: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  onToggleFavorite: () => void;
}

export function SearchModal({
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glass-strong mx-2 mb-3 rounded-3xl p-4 animate-slide-up safe-bottom">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white/70">Chercher un subreddit</p>
          <button
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70"
            onClick={onClose}
            type="button"
          >
            <X size={15} />
          </button>
        </div>
        <SubredditInput
          autoFocus
          isFavorite={isFavorite}
          onSubmit={handleSubmit}
          onToggleFavorite={onToggleFavorite}
          recent={recent}
          value={value}
        />
      </div>
    </div>
  );
}
