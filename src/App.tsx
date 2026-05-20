import { clearListingCache } from "./api/reddit";
import { Layers, Loader2, Settings } from "lucide-react";
import { useScrollDirection } from "./hooks/useScrollDirection";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { CustomFeedManager } from "./components/CustomFeedManager";
import { CustomFeedsStrip, FavoritesStrip } from "./components/FeedSelector";
import { HeaderContext } from "./components/HeaderContext";
import { ImageGrid } from "./components/ImageGrid";
import { ImageViewer } from "./components/ImageViewer";
import { ScrollToTop } from "./components/ScrollToTop";
import { SettingsPopover } from "./components/SettingsPopover";
import { SortBar } from "./components/SortBar";
import { SubredditInput } from "./components/SubredditInput";
import type { CustomFeed } from "./hooks/useCustomFeeds";
import { useCustomFeeds } from "./hooks/useCustomFeeds";
import { useFavorites, normalizeSubreddit } from "./hooks/useFavorites";
import { useFeed } from "./hooks/useFeed";
import { usePullToRefresh } from "./hooks/usePullToRefresh";
import { useRecent } from "./hooks/useRecent";
import { useSavedPosts } from "./hooks/useSavedPosts";
import { useSettings } from "./hooks/useSettings";
import type { FeedTab, FeedTarget } from "./types/reddit";

export default function App() {
  const { settings, toggle: toggleSetting, set: setSetting } = useSettings();
  const [activeTab, setActiveTab] = useState<FeedTab>(settings.defaultTab);
  const [subreddit, setSubreddit] = useState("pics");
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const sort = settings.sort;
  const period = settings.period;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showFeedManager, setShowFeedManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tabKey, setTabKey] = useState(0);

  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const customFeeds = useCustomFeeds();
  const { recent, push: pushRecent } = useRecent();
  const savedPosts = useSavedPosts();

  const selectedFeed = useMemo<CustomFeed | null>(
    () => (selectedFeedId ? customFeeds.byId.get(selectedFeedId) ?? null : null),
    [customFeeds.byId, selectedFeedId]
  );

  useEffect(() => {
    if (activeTab === "multi" && !selectedFeed && customFeeds.feeds.length > 0) {
      setSelectedFeedId(customFeeds.feeds[0].id);
    }
  }, [activeTab, customFeeds.feeds, selectedFeed]);

  const target = useMemo<FeedTarget | null>(() => {
    if (activeTab === "multi") {
      if (!selectedFeed) return null;
      return {
        kind: "multi",
        id: selectedFeed.id,
        name: selectedFeed.name,
        subreddits: selectedFeed.subreddits
      };
    }
    if (activeTab === "saved") {
      return null;
    }
    return { kind: "subreddit", name: subreddit };
  }, [activeTab, selectedFeed, subreddit]);

  const fallbackTarget = useMemo<FeedTarget>(
    () => target ?? { kind: "subreddit", name: subreddit },
    [target, subreddit]
  );
  const feed = useFeed(fallbackTarget, sort, period, { allowNsfw: settings.nsfw });

  const isSavedTab = activeTab === "saved";
  const isMultiTab = activeTab === "multi";
  const showSearch = !isMultiTab && !isSavedTab;
  const displayPosts = isSavedTab ? savedPosts.list : feed.posts;

  const handleSubmitSubreddit = useCallback(
    (name: string) => {
      const next = normalizeSubreddit(name);
      if (!next) return;
      setSubreddit(next);
      setActiveTab("subreddits");
      pushRecent(next);
    },
    [pushRecent]
  );

  const handleSelectFavorite = useCallback(
    (name: string) => {
      setSubreddit(name);
      pushRecent(name);
    },
    [pushRecent]
  );

  const handleSelectCustomFeed = useCallback((selected: CustomFeed) => {
    setSelectedFeedId(selected.id);
  }, []);

  const handleTabChange = useCallback((tab: FeedTab) => {
    setActiveTab(tab);
    setTabKey((k) => k + 1);
  }, []);

  const refresh = useCallback(async () => {
    if (isSavedTab) return;
    await feed.refresh();
  }, [feed, isSavedTab]);

  const ptr = usePullToRefresh({
    onRefresh: refresh,
    enabled: !isSavedTab && viewerIndex === null && !showFeedManager && !showSettings
  });

  const headerCollapsed = useScrollDirection();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-3 pb-32">
      <header className={`glass sticky top-0 z-20 -mx-3 rounded-b-3xl px-4 pt-4 transition-[padding] duration-300 ${headerCollapsed && showSearch ? "pb-1" : "pb-3"}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <HeaderContext
            activeTab={activeTab}
            customFeed={selectedFeed}
            savedCount={savedPosts.list.length}
            subreddit={subreddit}
          />
          <button
            aria-label="Réglages"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-moss-100/80"
            onClick={() => setShowSettings(true)}
            type="button"
          >
            <Settings size={18} />
          </button>
        </div>

        {showSearch ? (
          <div
            className={`overflow-hidden transition-all duration-300 ${
              headerCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-20 opacity-100"
            }`}
          >
            <SubredditInput
              isFavorite={isFavorite(subreddit)}
              onSubmit={handleSubmitSubreddit}
              onToggleFavorite={() => toggleFavorite(subreddit)}
              recent={recent}
              value={subreddit}
            />
          </div>
        ) : null}
      </header>

      <PullIndicator pull={ptr.pull} isRefreshing={ptr.isRefreshing} triggered={ptr.triggered} />

      <main className="flex-1 py-4">
        <div className="space-y-4 animate-fade-in" key={tabKey}>
        {activeTab === "favorites" ? (
          <FavoritesStrip
            favorites={favorites}
            onSelect={handleSelectFavorite}
            selectedSubreddit={subreddit}
          />
        ) : null}

        {isMultiTab ? (
          <CustomFeedsStrip
            feeds={customFeeds.feeds}
            onOpenManager={() => setShowFeedManager(true)}
            onSelect={handleSelectCustomFeed}
            selectedFeedId={selectedFeedId}
          />
        ) : null}

        {!isSavedTab ? (
          <SortBar
            onPeriodChange={(p) => setSetting("period", p)}
            onSortChange={(s) => setSetting("sort", s)}
            period={period}
            sort={sort}
          />
        ) : null}

        {isMultiTab && !selectedFeed ? (
          <MultiEmpty onOpenManager={() => setShowFeedManager(true)} />
        ) : (
          <ImageGrid
            autoplay={settings.autoplay}
            error={isSavedTab ? null : feed.error}
            hasMore={isSavedTab ? false : feed.hasMore}
            isInitialLoading={isSavedTab ? false : feed.isInitialLoading}
            isLoading={isSavedTab ? false : feed.isLoading}
            isSaved={savedPosts.isSaved}
            isSavedTab={isSavedTab}
            onLoadMore={feed.loadMore}
            onOpen={setViewerIndex}
            onRetry={feed.retry}
            onSubredditTap={handleSubmitSubreddit}
            onToggleSave={savedPosts.toggle}
            posts={displayPosts}
          />
        )}
        </div>
      </main>

      <ScrollToTop />

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        savedCount={savedPosts.list.length}
      />

      {viewerIndex !== null ? (
        <ImageViewer
          hasMore={isSavedTab ? false : feed.hasMore}
          initialIndex={viewerIndex}
          isLoadingMore={isSavedTab ? false : feed.isLoading}
          isSaved={savedPosts.isSaved}
          onClose={() => setViewerIndex(null)}
          onLoadMore={feed.loadMore}
          onNavigateToSubreddit={handleSubmitSubreddit}
          onToggleSave={savedPosts.toggle}
          posts={displayPosts}
        />
      ) : null}

      {showFeedManager ? (
        <CustomFeedManager
          favorites={favorites}
          feeds={customFeeds.feeds}
          onClose={() => setShowFeedManager(false)}
          onCreate={customFeeds.create}
          onDelete={(id) => {
            customFeeds.remove(id);
            if (selectedFeedId === id) setSelectedFeedId(null);
          }}
          onOpenFeed={(feedToOpen) => {
            setSelectedFeedId(feedToOpen.id);
            setActiveTab("multi");
          }}
          onUpdate={customFeeds.update}
        />
      ) : null}

      {showSettings ? (
        <SettingsPopover
          onClearCache={clearListingCache}
          onClose={() => setShowSettings(false)}
          onSet={setSetting}
          onToggle={toggleSetting}
          settings={settings}
        />
      ) : null}
    </div>
  );
}

interface PullIndicatorProps {
  pull: number;
  isRefreshing: boolean;
  triggered: boolean;
}

// memo prevents the pull indicator state (which changes at ~60 fps during a
// gesture) from triggering full App re-renders.
const PullIndicator = memo(function PullIndicator({ pull, isRefreshing, triggered }: PullIndicatorProps) {
  if (pull <= 0 && !isRefreshing) return null;
  const scale = Math.min(1, pull / 70);
  return (
    <div
      aria-hidden
      className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-100"
      style={{ height: isRefreshing ? 56 : pull }}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-full border border-accent-400/40 bg-white/5 text-accent-300 backdrop-blur-md ${
          isRefreshing ? "animate-pulse-glow" : ""
        }`}
        style={{ transform: `scale(${0.6 + scale * 0.4})`, opacity: isRefreshing ? 1 : scale }}
      >
        <Loader2
          className={isRefreshing ? "animate-spin" : ""}
          size={18}
          strokeWidth={triggered || isRefreshing ? 2.5 : 1.8}
        />
      </span>
    </div>
  );
});

function MultiEmpty({ onOpenManager }: { onOpenManager: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-3xl p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-400/15 text-accent-300">
        <Layers size={22} />
      </span>
      <p className="text-base font-semibold tracking-tight text-white">
        Crée un mix de subreddits
      </p>
      <p className="max-w-[260px] text-xs text-moss-100/65">
        Combine plusieurs subreddits dans un même feed pour les parcourir d'un coup, trié par hot/new/top.
      </p>
      <button
        className="mt-1 rounded-full bg-accent-400 px-5 py-2 text-sm font-bold text-moss-950 shadow-glow-accent-strong"
        onClick={onOpenManager}
        type="button"
      >
        Nouveau mix
      </button>
    </div>
  );
}
