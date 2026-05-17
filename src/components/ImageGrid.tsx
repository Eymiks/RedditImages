import { Bookmark, ExternalLink, Flame, Heart, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  onOpen: (index: number) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onToggleSave: (post: ImagePost) => void;
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
  onOpen,
  onLoadMore,
  onRetry,
  onToggleSave
}: ImageGridProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const [heartFor, setHeartFor] = useState<string | null>(null);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  const handleTap = (index: number, post: ImagePost) => {
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
  };

  if (isInitialLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="shimmer-bg aspect-[3/4] animate-shimmer rounded-3xl" key={index} />
        ))}
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
    return (
      <div className="glass rounded-3xl p-5 text-center">
        <p className="text-sm font-semibold text-white">Aucun média trouvé</p>
        <p className="mt-1 text-xs text-moss-100/65">Essaie un autre tri ou un autre subreddit.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {posts.map((post, index) => {
          const saved = isSaved(post.id);
          const showHeart = heartFor === post.id;
          return (
            <button
              className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-black/40 text-left shadow-glow transition-all duration-300 active:scale-[0.98]"
              key={post.id}
              onClick={() => handleTap(index, post)}
              type="button"
            >
              {post.assets[0]?.source === "redgifs" ? (
                <div className="flex h-full w-full items-center justify-center bg-black/40">
                  {post.assets[0].previewUrl ? (
                    <img
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      src={post.assets[0].previewUrl}
                    />
                  ) : null}
                  <span className="relative grid h-12 w-12 place-items-center rounded-full bg-black/65 text-white shadow-lg">
                    <Play fill="currentColor" size={22} />
                  </span>
                </div>
              ) : post.assets[0]?.kind === "video" && post.assets[0].url && autoplay ? (
                <video
                  className="h-full w-full object-cover"
                  loop
                  muted
                  playsInline
                  preload="none"
                  poster={post.assets[0].previewUrl}
                  src={post.assets[0].url}
                />
              ) : post.assets[0]?.kind === "video" ? (
                <div className="relative flex h-full w-full items-center justify-center bg-black/40">
                  {post.assets[0].previewUrl ? (
                    <img
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                      loading="lazy"
                      src={post.assets[0].previewUrl}
                    />
                  ) : null}
                  <span className="relative grid h-12 w-12 place-items-center rounded-full bg-black/65 text-white">
                    <Play fill="currentColor" size={22} />
                  </span>
                </div>
              ) : post.assets[0] ? (
                <img
                  alt={post.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  src={post.assets[0]?.previewUrl ?? post.assets[0]?.url}
                />
              ) : (
                <div className="h-full w-full bg-black/40" />
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent p-3 pt-8">
                <p className="title-shadow line-clamp-2 text-xs font-semibold leading-snug text-white">
                  {post.title}
                </p>
                <p className="title-shadow mt-0.5 text-[10px] font-medium uppercase tracking-wider text-moss-100/70">
                  r/{post.subreddit}
                </p>
              </div>

              <div className="absolute left-2 top-2 flex items-center gap-1.5">
                {post.nsfw ? (
                  <span
                    aria-label="NSFW"
                    className="h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-red-200/40 ring-offset-1 ring-offset-black/30"
                  />
                ) : null}
                {post.assets.length > 1 ? (
                  <span className="glass-dark grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold text-white">
                    {post.assets.length}
                  </span>
                ) : null}
              </div>

              <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                {post.assets[0]?.source === "redgifs" ? (
                  <span
                    aria-label="Redgifs"
                    className="grid h-6 w-6 place-items-center rounded-full bg-orange-500/90 text-white shadow-[0_0_10px_-2px_rgba(249,115,22,0.7)]"
                  >
                    <Flame fill="currentColor" size={12} />
                  </span>
                ) : post.assets[0]?.kind === "video" ? (
                  <span
                    aria-label="Video"
                    className="glass-dark grid h-6 w-6 place-items-center rounded-full text-white"
                  >
                    <Play fill="currentColor" size={10} />
                  </span>
                ) : null}
                {saved ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-400 text-moss-950 shadow-glow-accent">
                    <Bookmark fill="currentColor" size={13} />
                  </span>
                ) : null}
              </div>

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
        })}
      </div>

      {error ? (
        <div className="glass rounded-2xl border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div ref={sentinelRef} />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="shimmer-bg aspect-[3/4] animate-shimmer rounded-3xl" />
          <div className="shimmer-bg aspect-[3/4] animate-shimmer rounded-3xl" />
        </div>
      ) : null}

      {!hasMore && posts.length > 0 ? (
        <a
          className="glass mx-auto inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm text-moss-100/75"
          href={posts.at(-1)?.permalink}
          rel="noreferrer"
          target="_blank"
        >
          Fin du feed
          <ExternalLink size={15} />
        </a>
      ) : null}
    </section>
  );
}
