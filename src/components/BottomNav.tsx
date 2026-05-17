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
    iconActive: <Grid2X2 size={20} strokeWidth={2.4} />
  },
  {
    id: "multi",
    label: "Mix",
    icon: <Layers size={20} strokeWidth={1.8} />,
    iconActive: <Layers size={20} fill="currentColor" strokeWidth={2.2} />
  },
  {
    id: "favorites",
    label: "Favoris",
    icon: <FolderHeart size={20} strokeWidth={1.8} />,
    iconActive: <FolderHeart size={20} fill="currentColor" strokeWidth={2.2} />
  },
  {
    id: "saved",
    label: "Saved",
    icon: <Bookmark size={20} strokeWidth={1.8} />,
    iconActive: <Bookmark size={20} fill="currentColor" strokeWidth={2.2} />
  }
];

export function BottomNav({ activeTab, savedCount, onTabChange }: BottomNavProps) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTab)
  );

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-2">
      <div className="pointer-events-auto safe-bottom-nav relative w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/10 bg-moss-950/85 backdrop-blur-2xl shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.55)]">
        <div
          aria-hidden
          className="absolute left-0 top-0 h-[3px] rounded-full bg-accent-400 shadow-glow-accent transition-transform duration-300 ease-out"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`
          }}
        />
        <div className="grid grid-cols-4">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-1 py-2.5 transition-colors duration-200 ${
                  active ? "text-accent-300" : "text-moss-100/55 hover:text-moss-100/85"
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
                    <span className="absolute -right-2 -top-1.5 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-accent-400 px-1 text-[10px] font-bold text-moss-950 shadow-glow-accent">
                      {savedCount > 99 ? "99+" : savedCount}
                    </span>
                  ) : null}
                </span>
                <span className={`text-[11px] font-semibold ${active ? "tracking-tight" : ""}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
