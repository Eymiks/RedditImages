import { Flame, TrendingUp, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { SortName, TopPeriod } from "../types/reddit";
import { haptic } from "../utils/haptics";

interface SortBarProps {
  sort: SortName;
  period: TopPeriod;
  onSortChange: (sort: SortName) => void;
  onPeriodChange: (period: TopPeriod) => void;
}

const sorts: { id: SortName; label: string; icon: ReactNode }[] = [
  { id: "hot", label: "Hot", icon: <Flame size={13} /> },
  { id: "new", label: "Nouveau", icon: <Zap size={13} /> },
  { id: "top", label: "Top", icon: <TrendingUp size={13} /> }
];

const periods: TopPeriod[] = ["day", "week", "month", "year", "all"];

const periodLabel: Record<TopPeriod, string> = {
  day: "24h",
  week: "Semaine",
  month: "Mois",
  year: "Année",
  all: "Tout"
};

export function SortBar({ sort, period, onSortChange, onPeriodChange }: SortBarProps) {
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
      {sorts.map((item) => {
        const active = sort === item.id;
        return (
          <button
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-all duration-200 ${
              active
                ? "bg-accent-400 font-extrabold text-surface-950 shadow-glow-accent-strong"
                : "border border-white/10 bg-white/[0.04] font-semibold text-white/50 hover:text-white/80"
            }`}
            key={item.id}
            onClick={() => {
              if (!active) {
                haptic("light");
                onSortChange(item.id);
              }
            }}
            type="button"
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
      {sort === "top" ? (
        <>
          <span className="shrink-0 text-white/20">·</span>
          {periods.map((item) => {
            const active = period === item;
            return (
              <button
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-all duration-200 animate-scale-in ${
                  active
                    ? "bg-accent-400 font-extrabold text-surface-950 shadow-glow-accent-strong"
                    : "border border-white/10 bg-white/[0.04] font-semibold text-white/50 hover:text-white/80"
                }`}
                key={item}
                onClick={() => {
                  if (!active) {
                    haptic("light");
                    onPeriodChange(item);
                  }
                }}
                type="button"
              >
                {periodLabel[item]}
              </button>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
