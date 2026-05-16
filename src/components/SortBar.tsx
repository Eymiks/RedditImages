import type { SortName, TopPeriod } from "../types/reddit";

interface SortBarProps {
  sort: SortName;
  period: TopPeriod;
  onSortChange: (sort: SortName) => void;
  onPeriodChange: (period: TopPeriod) => void;
}

const sorts: SortName[] = ["hot", "new", "top"];
const periods: TopPeriod[] = ["day", "week", "month", "year", "all"];

export function SortBar({ sort, period, onSortChange, onPeriodChange }: SortBarProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1">
        {sorts.map((item) => (
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
              sort === item ? "bg-moss-100 text-moss-950" : "text-moss-100/72"
            }`}
            key={item}
            onClick={() => onSortChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      {sort === "top" ? (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {periods.map((item) => (
            <button
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold capitalize ${
                period === item
                  ? "border-moss-100 bg-moss-100 text-moss-950"
                  : "border-white/10 bg-white/5 text-moss-100/72"
              }`}
              key={item}
              onClick={() => onPeriodChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
