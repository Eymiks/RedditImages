import { clearListingCache } from "./api/reddit";
import { Layers, Loader2, Search, Settings } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { CustomFeedManager } from "./components/CustomFeedManager";
import { CustomFeedsStrip, FavoritesStrip } from "./components/FeedSelector";
import { HeaderContext } from "./components/HeaderContext";
import { ImageGrid } from "./components/ImageGrid";
import { ImageViewer } from "./components/ImageViewer";
import { ScrollToTop } from "./components/ScrollToTop";
import { SearchModal } from "./components/SearchModal";
import { SettingsPopover } from "./components/SettingsPopover";
import { SortBar } from "./components/SortBar";
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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [tabKey, setTabKey] = useState(0);
  const skipNextPopState = useRef(false);

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

  const handleOpenViewer = useCallback((index: number) => {
    history.pushState({ modal: "viewer" }, "");
    setViewerIndex(index);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerIndex(null);
    if (history.state?.modal) {
      skipNextPopState.current = true;
      history.back();
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    history.pushState({ modal: "settings" }, "");
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
    if (history.state?.modal) {
      skipNextPopState.current = true;
      history.back();
    }
  }, []);

  const handleOpenFeedManager = useCallback(() => {
    history.pushState({ modal: "feedManager" }, "");
    setShowFeedManager(true);
  }, []);

  const handleCloseFeedManager = useCallback(() => {
    setShowFeedManager(false);
    if (history.state?.modal) {
      skipNextPopState.current = true;
      history.back();
    }
  }, []);

  const handleOpenSearch = useCallback(() => {
    history.pushState({ modal: "search" }, "");
    setShowSearchModal(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setShowSearchModal(false);
    if (history.state?.modal) {
      skipNextPopState.current = true;
      history.back();
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (skipNextPopState.current) {
        skipNextPopState.current = false;
        return;
      }
      if (viewerIndex !== null) {
        setViewerIndex(null);
      } else if (showFeedManager) {
        setShowFeedManager(false);
      } else if (showSettings) {
        setShowSettings(false);
      } else if (showSearchModal) {
        setShowSearchModal(false);
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [viewerIndex, showFeedManager, showSettings, showSearchModal]);

  const refresh = useCallback(async () => {
    if (isSavedTab) return;
    await feed.refresh();
  }, [feed, isSavedTab]);

  const ptr = usePullToRefresh({
    onRefresh: refresh,
    enabled: !isSavedTab && viewerIndex === null && !showFeedManager && !showSettings && !showSearchModal
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-3 pb-32">
      <header className="glass sticky top-0 z-20 -mx-3 rounded-b-3xl px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <HeaderContext
            activeTab={activeTab}
            customFeed={selectedFeed}
            savedCount={savedPosts.list.length}
            subreddit={subreddit}
          />
          <div className="flex shrink-0 items-center gap-2">
            {showSearch ? (
              <button
                aria-label="Chercher un subreddit"
                className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-white/50 transition-colors active:bg-white/10"
                onClick={handleOpenSearch}
                type="button"
              >
                <Search size={15} />
                <span className="max-w-[80px] truncate text-xs font-medium">r/{subreddit}</span>
              </button>
            ) : null}
            <button
              aria-label="Réglages"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/70"
              onClick={handleOpenSettings}
              type="button"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
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
            onOpenManager={handleOpenFeedManager}
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
          <MultiEmpty onOpenManager={handleOpenFeedManager} />
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
            onOpen={handleOpenViewer}
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
          onClose={handleCloseViewer}
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
          onClose={handleCloseFeedManager}
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
          onClose={handleCloseSettings}
          onSet={setSetting}
          onToggle={toggleSetting}
          settings={settings}
        />
      ) : null}

      {showSearchModal ? (
        <SearchModal
          favorites={favorites}
          isFavorite={isFavorite(subreddit)}
          onClose={handleCloseSearch}
          onSubmit={handleSubmitSubreddit}
          onToggleFavorite={() => toggleFavorite(subreddit)}
          recent={recent}
          value={subreddit}
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
      <p className="max-w-[260px] text-xs text-white/55">
        Combine plusieurs subreddits dans un même feed pour les parcourir d'un coup, trié par hot/new/top.
      </p>
      <button
        className="mt-1 rounded-full bg-accent-400 px-5 py-2 text-sm font-bold text-surface-950 shadow-glow-accent-strong"
        onClick={onOpenManager}
        type="button"
      >
        Nouveau mix
      </button>
    </div>
  );
}
