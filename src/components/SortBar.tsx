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
  { id: "hot", label: "Hot", icon: <Flame size={14} /> },
  { id: "new", label: "Nouveau", icon: <Zap size={14} /> },
  { id: "top", label: "Top", icon: <TrendingUp size={14} /> }
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
    <div className="space-y-2">
      <div className="glass grid grid-cols-3 gap-1 rounded-2xl p-1">
        {sorts.map((item) => {
          const active = sort === item.id;
          return (
            <button
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                active
                  ? "bg-accent-400 text-moss-950 font-extrabold shadow-glow-accent-strong"
                  : "font-semibold text-moss-100/55 hover:text-moss-100/85"
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
      </div>
      {sort === "top" ? (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 animate-fade-in">
          {periods.map((item) => {
            const active = period === item;
            return (
              <button
                className={`shrink-0 rounded-full text-[11px] transition-all duration-200 ${
                  active
                    ? "bg-accent-400 px-4 py-1.5 font-extrabold text-moss-950 shadow-glow-accent-strong"
                    : "border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-moss-100/55 hover:text-moss-100/85"
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
        </div>
      ) : null}
    </div>
  );
}
