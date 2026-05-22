import { Bookmark, Download, Eye, EyeOff, FolderHeart, Grid2X2, Layers, PlayCircle, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Settings } from "../hooks/useSettings";
import type { FeedTab } from "../types/reddit";
import { haptic } from "../utils/haptics";

interface SettingsPopoverProps {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onSet: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClearCache: () => number;
  onExportConfig: () => void;
  onImportConfig: (file: File) => Promise<void>;
  onClose: () => void;
}

const TAB_OPTIONS: { id: FeedTab; label: string; icon: React.ReactNode }[] = [
  { id: "subreddits", label: "Sub", icon: <Grid2X2 size={14} /> },
  { id: "multi", label: "Mix", icon: <Layers size={14} /> },
  { id: "favorites", label: "Favoris", icon: <FolderHeart size={14} /> },
  { id: "saved", label: "Saved", icon: <Bookmark size={14} /> },
];

export function SettingsPopover({
  settings,
  onToggle,
  onSet,
  onClearCache,
  onExportConfig,
  onImportConfig,
  onClose
}: SettingsPopoverProps) {
  const [cacheCleared, setCacheCleared] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleClearCache = () => {
    haptic("medium");
    onClearCache();
    setCacheCleared(true);
    window.setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleExportConfig = () => {
    haptic("light");
    onExportConfig();
    setConfigStatus({ type: "success", text: "Configuration exportée" });
  };

  const handleImportClick = () => {
    haptic("light");
    fileInputRef.current?.click();
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setConfigStatus(null);
    try {
      await onImportConfig(file);
      setConfigStatus({ type: "success", text: "Configuration importée" });
    } catch (error) {
      setConfigStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Import impossible"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/55 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong w-full max-w-[430px] mx-auto rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-2 flex items-center justify-between px-5 py-3">
          <h2 className="text-base font-semibold tracking-tight">Réglages</h2>
          <button
            aria-label="Fermer"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4">

        <ToggleRow
          icon={settings.nsfw ? <Eye size={18} /> : <EyeOff size={18} />}
          title="Contenu NSFW"
          subtitle="Afficher les posts marqués 18+"
          value={settings.nsfw}
          onChange={() => {
            haptic("light");
            onToggle("nsfw");
          }}
        />
        <ToggleRow
          icon={<PlayCircle size={18} />}
          title="Lecture auto"
          subtitle="Boucler les vidéos dans la grille"
          value={settings.autoplay}
          onChange={() => {
            haptic("light");
            onToggle("autoplay");
          }}
        />

        <div className="px-2 py-3">
          <p className="mb-1 text-sm font-semibold text-white">Onglet par défaut</p>
          <p className="mb-3 text-xs text-moss-100/65">À l'ouverture de l'app</p>
          <div className="flex gap-2">
            {TAB_OPTIONS.map((tab) => {
              const active = settings.defaultTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-accent-400/15 text-accent-300"
                      : "bg-white/5 text-moss-100/65 hover:bg-white/10"
                  }`}
                  onClick={() => {
                    haptic("light");
                    onSet("defaultTab", tab.id);
                  }}
                  type="button"
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-1 border-t border-white/8 px-2 pt-3">
          <p className="mb-1 text-sm font-semibold text-white">Configuration</p>
          <p className="mb-3 text-xs text-moss-100/65">Réglages, favoris et mixes personnalisés</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              onClick={handleExportConfig}
              type="button"
            >
              <Download size={17} />
              Exporter
            </button>
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
              disabled={isImporting}
              onClick={handleImportClick}
              type="button"
            >
              <Upload size={17} />
              {isImporting ? "Import..." : "Importer"}
            </button>
          </div>
          <input
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportChange}
            ref={fileInputRef}
            type="file"
          />
          {configStatus ? (
            <p className={`mt-2 text-xs ${configStatus.type === "error" ? "text-red-300" : "text-accent-300"}`}>
              {configStatus.text}
            </p>
          ) : null}
        </div>

        <div className="mt-1 border-t border-white/8 pt-3">
          <button
            className={`flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-white/5 ${cacheCleared ? "opacity-60" : ""}`}
            disabled={cacheCleared}
            onClick={handleClearCache}
            type="button"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-moss-100/65">
              <Trash2 size={18} />
            </span>
            <span className="flex-1">
              <p className="text-sm font-semibold text-white">Vider le cache</p>
              <p className="text-xs text-moss-100/65">
                {cacheCleared ? "Cache vidé ✓" : "Supprimer les données de navigation temporaires"}
              </p>
            </span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: () => void;
}

function ToggleRow({ icon, title, subtitle, value, onChange }: ToggleRowProps) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-white/5"
      onClick={onChange}
      type="button"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${value ? "bg-accent-400/15 text-accent-300" : "bg-white/5 text-moss-100/65"}`}>
        {icon}
      </span>
      <span className="flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-moss-100/65">{subtitle}</p>
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-accent-400" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
