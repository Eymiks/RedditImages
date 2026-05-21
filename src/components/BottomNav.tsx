import { Bookmark, FolderHeart, Grid2X2, Layers } from "lucide-react";
import type { ReactNode } from "react";
import type { FeedTab } from "../types/reddit";
import { haptic } from "../utils/haptics";

interface BottomNavProps {
  activeTab: FeedTab;
  savedCount: number;
  onTabChange: (tab: FeedTab) => void;
}

interface TabDef {
  id: FeedTab;
  label: string;
  icon: ReactNode;
  iconActive: ReactNode;
}

const tabs: TabDef[] = [
  {
    id: "subreddits",
    label: "Sub",
    icon: <Grid2X2 size={20} strokeWidth={1.8} />,
    iconActive: <Grid2X2 size={20} strokeWidth={2.5} />
  },
  {
    id: "multi",
    label: "Mix",
    icon: <Layers size={20} strokeWidth={1.8} />,
    iconActive: <Layers size={20} fill="currentColor" strokeWidth={2} />
  },
  {
    id: "favorites",
    label: "Favoris",
    icon: <FolderHeart size={20} strokeWidth={1.8} />,
    iconActive: <FolderHeart size={20} fill="currentColor" strokeWidth={2} />
  },
  {
    id: "saved",
    label: "Saved",
    icon: <Bookmark size={20} strokeWidth={1.8} />,
    iconActive: <Bookmark size={20} fill="currentColor" strokeWidth={2} />
  }
];

export function BottomNav({ activeTab, savedCount, onTabChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigation principale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-surface-950/95 px-2 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-2xl">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              aria-current={active ? "page" : undefined}
              aria-label={tab.label}
              className={`relative flex flex-col items-center gap-1 rounded-full px-4 py-2.5 transition-all duration-200 ${
                active
                  ? "bg-accent-400/15 text-accent-400"
                  : "text-white/40 hover:text-white/70"
              }`}
              key={tab.id}
              onClick={() => {
                if (!active) {
                  haptic("light");
                  onTabChange(tab.id);
                }
              }}
              type="button"
            >
              <span className="relative">
                {active ? tab.iconActive : tab.icon}
                {tab.id === "saved" && savedCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 grid min-h-[15px] min-w-[15px] place-items-center rounded-full bg-accent-400 px-0.5 text-[9px] font-bold leading-none text-surface-950 shadow-glow-accent">
                    {savedCount > 99 ? "99+" : savedCount}
                  </span>
                ) : null}
              </span>
              <span className={`text-[9px] font-semibold leading-none tracking-wide ${active ? "text-accent-400" : "text-white/35"}`}>
                {tab.label}
              </span>
              {active ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent-400" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
