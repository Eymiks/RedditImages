import { useMemo, useState } from "react";
import { FeedSelector } from "./components/FeedSelector";
import { ImageGrid } from "./components/ImageGrid";
import { ImageViewer } from "./components/ImageViewer";
import { SortBar } from "./components/SortBar";
import { SubredditInput } from "./components/SubredditInput";
import { useFavorites, normalizeSubreddit } from "./hooks/useFavorites";
import { useFeed } from "./hooks/useFeed";
import type { FeedTab, FeedTarget, SortName, TopPeriod } from "./types/reddit";

export default function App() {
  const [activeTab, setActiveTab] = useState<FeedTab>("subreddits");
  const [subreddit, setSubreddit] = useState("pics");
  const [sort, setSort] = useState<SortName>("hot");
  const [period, setPeriod] = useState<TopPeriod>("week");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const target = useMemo<FeedTarget>(() => ({ kind: "subreddit", name: subreddit }), [subreddit]);

  const feed = useFeed(target, sort, period);
  const title = `r/${subreddit}`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-3 safe-bottom">
      <header className="sticky top-0 z-20 -mx-3 border-b border-white/10 bg-moss-950/92 px-3 pb-3 pt-4 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss-100/55">
              Reddit Images
            </p>
            <h1 className="truncate text-2xl font-bold text-white">{title}</h1>
          </div>
          <span className="shrink-0 rounded-full border border-moss-100/15 bg-white/8 px-3 py-2 text-xs font-semibold text-moss-100/70">
            JSON public
          </span>
        </div>

        <SubredditInput
          isFavorite={isFavorite(subreddit)}
          onSubmit={(name) => {
            const next = normalizeSubreddit(name);
            if (next) {
              setSubreddit(next);
              setActiveTab("subreddits");
            }
          }}
          onToggleFavorite={() => toggleFavorite(subreddit)}
          value={subreddit}
        />
      </header>

      <main className="flex-1 space-y-4 py-4">
        <FeedSelector
          activeTab={activeTab}
          favorites={favorites}
          onSelectFavorite={(name) => {
            setSubreddit(name);
          }}
          onTabChange={setActiveTab}
          selectedSubreddit={subreddit}
        />

        <SortBar
          onPeriodChange={setPeriod}
          onSortChange={setSort}
          period={period}
          sort={sort}
        />

        <ImageGrid
          error={feed.error}
          hasMore={feed.hasMore}
          isInitialLoading={feed.isInitialLoading}
          isLoading={feed.isLoading}
          onLoadMore={feed.loadMore}
          onOpen={setViewerIndex}
          onRetry={feed.retry}
          posts={feed.posts}
        />
      </main>

      {viewerIndex !== null ? (
        <ImageViewer
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          posts={feed.posts}
        />
      ) : null}
    </div>
  );
}
