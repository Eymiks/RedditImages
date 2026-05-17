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
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-accent-300">
        {info.icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-300/80">
          {info.subtitle}
        </p>
        <h1 className="truncate text-xl font-bold tracking-tight text-white">{info.title}</h1>
      </div>
    </div>
  );
}

function resolve({ activeTab, subreddit, customFeed, savedCount }: HeaderContextProps): ContextInfo {
  if (activeTab === "saved") {
    return {
      title: "Sauvegardés",
      subtitle: savedCount > 0 ? `${savedCount} post${savedCount > 1 ? "s" : ""} gardés` : "Aucun post",
      icon: <Bookmark fill="currentColor" size={16} />
    };
  }
  if (activeTab === "multi") {
    if (!customFeed) {
      return {
        title: "Mix",
        subtitle: "Aucun mix sélectionné",
        icon: <Layers size={16} />
      };
    }
    return {
      title: customFeed.name,
      subtitle: `Mix · ${customFeed.subreddits.length} sub${customFeed.subreddits.length > 1 ? "s" : ""}`,
      icon: <Layers fill="currentColor" size={16} />
    };
  }
  if (activeTab === "favorites") {
    return {
      title: `r/${subreddit}`,
      subtitle: "Favori",
      icon: <Star fill="currentColor" size={16} />
    };
  }
  return {
    title: `r/${subreddit}`,
    subtitle: "Subreddit",
    icon: <Hash size={16} />
  };
}
