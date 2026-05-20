import { Bookmark, ExternalLink, Flame, Heart, Images, Play, Search } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImagePost } from "../types/reddit";
import { haptic } from "../utils/haptics";

interface ImageGridProps {
  posts: ImagePost[];
  isInitialLoading: boolean;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  isSaved: (id: string) => boolean;
  autoplay: boolean;
  isSavedTab?: boolean;
  onOpen: (index: number) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onToggleSave: (post: ImagePost) => void;
  onSubredditTap?: (subreddit: string) => void;
}

const DOUBLE_TAP_MS = 300;

export function ImageGrid({
  posts,
  isInitialLoading,
  isLoading,
  error,
  hasMore,
  isSaved,
  autoplay,
  isSavedTab,
  onOpen,
  onLoadMore,
  onRetry,
  onToggleSave,
  onSubredditTap
}: ImageGridProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const [heartFor, setHeartFor] = useState<string | null>(null);

  // Keep a stable ref so the IntersectionObserver callback can always access the
  // latest onLoadMore without needing to be recreated when it changes.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Only depend on hasMore / isLoading so the observer is not torn down every
  // time onLoadMore gets a new reference (which happens after each page load).
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) onLoadMoreRef.current();
      },
      { rootMargin: "500px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  // Stable callback — deps are the two props that actually change its behaviour.
  const handleTap = useCallback((index: number, post: ImagePost) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === post.id && now - last.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      onToggleSave(post);
      haptic("medium");
      setHeartFor(post.id);
      window.setTimeout(() => {
        setHeartFor((current) => (current === post.id ? null : current));
      }, 700);
      return;
    }
    lastTapRef.current = { id: post.id, time: now };
    window.setTimeout(() => {
      if (lastTapRef.current?.id === post.id && lastTapRef.current?.time === now) {
        lastTapRef.current = null;
        onOpen(index);
      }
    }, DOUBLE_TAP_MS);
  }, [onToggleSave, onOpen]);

  // Memoized so column arrays are not re-computed on every render (e.g. when
  // heartFor changes and only one PostCard needs updating).
  // Must be declared before any early returns to obey the Rules of Hooks.
  const [leftPosts, rightPosts] = useMemo(() => [
    posts.filter((_, i) => i % 2 === 0),
    posts.filter((_, i) => i % 2 === 1)
  ], [posts]);

  if (isInitialLoading) {
    return (
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <div className="shimmer-bg aspect-[2/3] animate-shimmer rounded-3xl" />
          <div className="shimmer-bg aspect-[4/5] animate-shimmer rounded-3xl" />
          <div className="shimmer-bg aspect-[3/4] animate-shimmer rounded-3xl" />
          <div className="shimmer-bg aspect-[1/1] animate-shimmer rounded-3xl" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="shimmer-bg aspect-[4/5] animate-shimmer rounded-3xl" />
          <div className="shimmer-bg aspect-[3/4] animate-shimmer rounded-3xl" />
          <div className="shimmer-bg aspect-[2/3] animate-shimmer rounded-3xl" />
          <div className="shimmer-bg aspect-[3/5] animate-shimmer rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="glass rounded-3xl border-red-300/20 bg-red-500/10 p-5">
        <p className="text-sm text-red-100">{error}</p>
        <button
          className="mt-3 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-950"
          onClick={onRetry}
          type="button"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    if (isSavedTab) {
      return (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="glass mb-5 grid h-16 w-16 place-items-center rounded-full">
            <Bookmark className="text-moss-100/50" size={28} />
          </div>
          <p className="text-sm font-semibold text-white">Aucune sauvegarde</p>
          <p className="mt-1 text-xs text-moss-100/55">Double-tape une image pour la sauvegarder ici.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="glass mb-5 grid h-16 w-16 place-items-center rounded-full">
          <Search className="text-moss-100/50" size={28} />
        </div>
        <p className="text-sm font-semibold text-white">Aucun média trouvé</p>
        <p className="mt-1 text-xs text-moss-100/55">Essaie un autre tri ou un autre subreddit.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-2">
          {leftPosts.map((post, colIdx) => (
            <PostCard
              autoplay={autoplay}
              index={colIdx * 2}
              isSaved={isSaved(post.id)}
              key={post.id}
              onSubredditTap={onSubredditTap}
              onTap={handleTap}
              post={post}
              showHeart={heartFor === post.id}
            />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {rightPosts.map((post, colIdx) => (
            <PostCard
              autoplay={autoplay}
              index={colIdx * 2 + 1}
              isSaved={isSaved(post.id)}
              key={post.id}
              onSubredditTap={onSubredditTap}
              onTap={handleTap}
              post={post}
              showHeart={heartFor === post.id}
            />
          ))}
        </div>
      </div>

      {error ? (
        <div className="glass rounded-2xl border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div ref={sentinelRef} />

      {isLoading ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="shimmer-bg aspect-[3/4] flex-1 animate-shimmer rounded-3xl" />
            <div className="shimmer-bg aspect-[4/5] flex-1 animate-shimmer rounded-3xl" />
          </div>
          <p className="text-center text-[11px] text-moss-100/40">Chargement…</p>
        </div>
      ) : null}

      {!hasMore && posts.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] text-moss-100/40">{posts.length} posts chargés</p>
          <a
            className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm text-moss-100/75"
            href={posts.at(-1)?.permalink}
            rel="noreferrer"
            target="_blank"
          >
            Fin du feed
            <ExternalLink size={15} />
          </a>
        </div>
      ) : null}
    </section>
  );
}

interface PostCardProps {
  post: ImagePost;
  index: number;
  isSaved: boolean;
  autoplay: boolean;
  showHeart: boolean;
  onTap: (index: number, post: ImagePost) => void;
  onSubredditTap?: (subreddit: string) => void;
}

// memo prevents re-rendering every PostCard when an unrelated card shows a heart
// animation or when the parent ImageGrid receives new props with identical values.
const PostCard = memo(function PostCard({ post, index, isSaved, autoplay, showHeart, onTap, onSubredditTap }: PostCardProps) {
  const asset = post.assets[0];
  const isVideo = asset?.kind === "video";
  const isRedgifs = asset?.source === "redgifs";

  return (
    <button
      className="group relative w-full overflow-hidden rounded-3xl bg-black/40 text-left shadow-glow transition-transform duration-200 active:scale-[0.97]"
      onClick={() => onTap(index, post)}
      type="button"
    >
      {/* Media content */}
      {isRedgifs ? (
        <div className="relative aspect-[3/4] bg-black/40">
          {asset.previewUrl ? (
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
              src={asset.previewUrl}
            />
          ) : null}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/65 text-white shadow-lg">
              <Play fill="currentColor" size={22} />
            </span>
          </span>
        </div>
      ) : isVideo && asset.url && autoplay ? (
        <div className="aspect-[3/4]">
          <video
            className="h-full w-full object-cover"
            loop
            muted
            playsInline
            preload="none"
            poster={asset.previewUrl}
            src={asset.url}
          />
        </div>
      ) : isVideo ? (
        <div className="relative aspect-[3/4] bg-black/40">
          {asset.previewUrl ? (
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
              loading="lazy"
              src={asset.previewUrl}
            />
          ) : null}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/65 text-white">
              <Play fill="currentColor" size={22} />
            </span>
          </span>
        </div>
      ) : asset ? (
        <img
          alt={post.title}
          className="block w-full transition duration-500 group-hover:scale-105"
          loading="lazy"
          src={asset.previewUrl ?? asset.url}
        />
      ) : (
        <div className="aspect-[3/4] bg-black/40" />
      )}

      {/* Bottom overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
          {post.title}
        </p>
        {onSubredditTap ? (
          // Must not be a <button> here — PostCard's outer element is already a
          // <button>, and nested interactive elements are invalid HTML.
          // Using a <span> with role="button" preserves accessibility.
          <span
            className="pointer-events-auto mt-1.5 inline-block cursor-pointer rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-moss-100/80 active:bg-white/20"
            onClick={(e) => { e.stopPropagation(); haptic("light"); onSubredditTap(post.subreddit); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); haptic("light"); onSubredditTap(post.subreddit); } }}
            role="button"
            tabIndex={0}
          >
            r/{post.subreddit}
          </span>
        ) : (
          <span className="mt-1.5 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-moss-100/80">
            r/{post.subreddit}
          </span>
        )}
      </div>

      {/* Top-left badges */}
      <div className="absolute left-2 top-2 flex items-center gap-1.5">
        {post.nsfw ? (
          <span
            aria-label="NSFW"
            className="h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-red-200/40 ring-offset-1 ring-offset-black/30"
          />
        ) : null}
        {post.assets.length > 1 ? (
          <span className="glass-dark flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
            <Images size={9} />
            {post.assets.length}
          </span>
        ) : null}
      </div>

      {/* Top-right badges */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
        {isRedgifs ? (
          <span
            aria-label="Redgifs"
            className="grid h-6 w-6 place-items-center rounded-full bg-orange-500/90 text-white shadow-[0_0_10px_-2px_rgba(249,115,22,0.7)]"
          >
            <Flame fill="currentColor" size={12} />
          </span>
        ) : isVideo ? (
          <span
            aria-label="Video"
            className="glass-dark grid h-6 w-6 place-items-center rounded-full text-white"
          >
            <Play fill="currentColor" size={10} />
          </span>
        ) : null}
        {isSaved ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-400 text-moss-950 shadow-glow-accent">
            <Bookmark fill="currentColor" size={13} />
          </span>
        ) : null}
      </div>

      {/* Double-tap heart */}
      {showHeart ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <Heart
            className="text-accent-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.85)] animate-heart-pop"
            fill="currentColor"
            size={72}
          />
        </span>
      ) : null}
    </button>
  );
});
