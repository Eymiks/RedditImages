import { Bookmark, Hash, Layers, Star } from "lucide-react";
import type { ReactNode } from "react";
import type { CustomFeed } from "../hooks/useCustomFeeds";
import type { FeedTab } from "../types/reddit";

interface HeaderContextProps {
  activeTab: FeedTab;
  subreddit: string;
  customFeed: CustomFeed | null;
  savedCount: number;
}

interface ContextInfo {
  title: string;
  subtitle: string;
  icon: ReactNode;
}

export function HeaderContext({ activeTab, subreddit, customFeed, savedCount }: HeaderContextProps) {
  const info = resolve({ activeTab, subreddit, customFeed, savedCount });
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-800 text-accent-300">
        {info.icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-accent-400/70">
          {info.subtitle}
        </p>
        <h1 className="truncate text-xl font-black tracking-tight text-white">{info.title}</h1>
      </div>
    </div>
  );
}

function resolve({ activeTab, subreddit, customFeed, savedCount }: HeaderContextProps): ContextInfo {
  if (activeTab === "saved") {
    return {
      title: "Sauvegardés",
      subtitle: savedCount > 0 ? `${savedCount} post${savedCount > 1 ? "s" : ""} gardés` : "Aucun post",
      icon: <Bookmark fill="currentColor" size={15} />
    };
  }
  if (activeTab === "multi") {
    if (!customFeed) {
      return {
        title: "Mix",
        subtitle: "Aucun mix sélectionné",
        icon: <Layers size={15} />
      };
    }
    return {
      title: customFeed.name,
      subtitle: `Mix · ${customFeed.subreddits.length} sub${customFeed.subreddits.length > 1 ? "s" : ""}`,
      icon: <Layers fill="currentColor" size={15} />
    };
  }
  if (activeTab === "favorites") {
    return {
      title: `r/${subreddit}`,
      subtitle: "Favori",
      icon: <Star fill="currentColor" size={15} />
    };
  }
  return {
    title: `r/${subreddit}`,
    subtitle: "Subreddit",
    icon: <Hash size={15} />
  };
}
