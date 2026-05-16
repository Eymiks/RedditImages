import { ExternalLink, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ImagePost } from "../types/reddit";

interface ImageGridProps {
  posts: ImagePost[];
  isInitialLoading: boolean;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onOpen: (index: number) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function ImageGrid({
  posts,
  isInitialLoading,
  isLoading,
  error,
  hasMore,
  onOpen,
  onLoadMore,
  onRetry
}: ImageGridProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  if (isInitialLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="aspect-[3/4] animate-pulse rounded-lg bg-white/8" key={index} />
        ))}
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="rounded-lg border border-red-300/20 bg-red-500/10 p-4 text-red-100">
        <p className="text-sm">{error}</p>
        <button
          className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-950"
          onClick={onRetry}
          type="button"
        >
          Reessayer
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-moss-100/75">
        <p className="text-sm font-semibold text-white">Aucun media trouve</p>
        <p className="mt-1 text-sm">Essaie un autre tri ou un autre subreddit.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {posts.map((post, index) => (
          <button
            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-black/30 text-left"
            key={post.id}
            onClick={() => onOpen(index)}
            type="button"
          >
            {post.assets[0]?.source === "redgifs" ? (
              <div className="flex h-full w-full items-center justify-center bg-black/40">
                {post.assets[0].previewUrl ? (
                  <img
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-active:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={post.assets[0].previewUrl}
                  />
                ) : null}
                <span className="relative grid h-12 w-12 place-items-center rounded-full bg-black/65 text-white shadow-lg">
                  <Play fill="currentColor" size={22} />
                </span>
              </div>
            ) : post.assets[0]?.kind === "video" && post.assets[0].url ? (
              <video
                className="h-full w-full object-cover"
                loop
                muted
                playsInline
                preload="metadata"
                poster={post.assets[0].previewUrl}
                referrerPolicy="no-referrer"
                src={post.assets[0].url}
              />
            ) : post.assets[0]?.kind === "video" ? (
              <div className="flex h-full w-full items-center justify-center bg-black/40">
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
                alt=""
                className="h-full w-full object-cover transition duration-300 group-active:scale-105"
                loading="lazy"
                src={post.assets[0]?.previewUrl ?? post.assets[0]?.url}
              />
            ) : (
              <div className="h-full w-full bg-black/40" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 to-transparent p-2 pt-10">
              <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{post.title}</p>
              <p className="mt-1 text-[11px] text-moss-100/76">r/{post.subreddit}</p>
            </div>
            {post.nsfw ? (
              <span className="absolute left-2 top-2 rounded bg-red-500 px-2 py-1 text-[10px] font-bold text-white">
                NSFW
              </span>
            ) : null}
            {post.assets.length > 1 ? (
              <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                {post.assets.length}
              </span>
            ) : null}
            {post.assets[0]?.source === "redgifs" ? (
              <span className="absolute right-2 top-2 rounded bg-orange-500 px-2 py-1 text-[10px] font-bold text-white">
                Redgifs
              </span>
            ) : post.assets[0]?.kind === "video" ? (
              <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                Video
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div ref={sentinelRef} />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="aspect-[3/4] animate-pulse rounded-lg bg-white/8" />
          <div className="aspect-[3/4] animate-pulse rounded-lg bg-white/8" />
        </div>
      ) : null}

      {!hasMore && posts.length > 0 ? (
        <a
          className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-moss-100/70"
          href={posts.at(-1)?.permalink}
          rel="noreferrer"
          target="_blank"
        >
          Dernier post
          <ExternalLink size={15} />
        </a>
      ) : null}
    </section>
  );
}
