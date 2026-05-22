import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowUp,
  Bookmark,
  Check,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { useSettings } from "../hooks/useSettings";
import type { ImageAsset, ImagePost } from "../types/reddit";
import { formatCount } from "../utils/formatCount";
import { haptic } from "../utils/haptics";

interface ImageViewerProps {
  posts: ImagePost[];
  initialIndex: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  isSaved: (id: string) => boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onToggleSave: (post: ImagePost) => void;
  onNavigateToSubreddit?: (subreddit: string) => void;
}

type VideoRefMap = Map<string, HTMLVideoElement>;
type ActiveAssetState = {
  postId: string;
  assetId: string;
  isVideo: boolean;
};

function useAutoHideUi(delayMs: number) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);

  const kick = useCallback(() => {
    setVisible(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setVisible(false), delayMs);
  }, [delayMs]);

  useEffect(() => {
    kick();
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [kick]);

  return { visible, kick };
}

export function ImageViewer({
  posts,
  initialIndex,
  hasMore,
  isLoadingMore,
  isSaved,
  onClose,
  onLoadMore,
  onToggleSave,
  onNavigateToSubreddit
}: ImageViewerProps) {
  const { settings, set: setSetting } = useSettings();
  const muted = settings.viewerMuted;
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "y",
    startIndex: initialIndex,
    loop: false
  });
  const videoRefs = useRef<VideoRefMap>(new Map());
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bottomOverlayRef = useRef<HTMLDivElement | null>(null);
  const [bottomOverlayHeight, setBottomOverlayHeight] = useState(132);
  const [activeAsset, setActiveAsset] = useState<ActiveAssetState | null>(null);
  const currentPost = posts[selectedIndex];
  const ui = useAutoHideUi(3000);
  const activeVideoKey =
    currentPost && activeAsset?.postId === currentPost.id && activeAsset.isVideo
      ? `${activeAsset.postId}:${activeAsset.assetId}`
      : null;
  const activeVideo = activeVideoKey ? videoRefs.current.get(activeVideoKey) ?? null : null;

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      ui.kick();
    };
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, ui]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, posts.length]);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    if (posts.length === 0) return;
    if (selectedIndex >= posts.length - 3) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore, posts.length, selectedIndex]);

  useEffect(() => {
    if (!currentPost) return;
    videoRefs.current.forEach((video, key) => {
      const isCurrent = activeVideoKey ? key === activeVideoKey : key.startsWith(`${currentPost.id}:`);
      if (isCurrent) {
        video.muted = muted;
        const promise = video.play();
        if (promise) {
          promise.catch(() => {
            // autoplay blocked, user will tap to unmute / play
          });
        }
      } else {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          // ignore
        }
      }
    });
  }, [activeVideoKey, currentPost, muted]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        videoRefs.current.forEach((video) => video.pause());
      } else if (currentPost) {
        videoRefs.current.forEach((video, key) => {
          if (key.startsWith(`${currentPost.id}:`)) {
            video.play().catch(() => {});
          }
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [currentPost]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown" || event.key === "ArrowRight") emblaApi?.scrollNext();
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") emblaApi?.scrollPrev();
      if (event.key === " ") {
        event.preventDefault();
        toggleCurrentVideo();
      }
      if (event.key.toLowerCase() === "m") setSetting("viewerMuted", !muted);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, onClose, muted]);

  useEffect(
    () => () => {
      videoRefs.current.forEach((video) => video.pause());
    },
    []
  );

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!emblaApi) return;
      if (e.deltaY > 5) {
        emblaApi.scrollNext();
      } else if (e.deltaY < -5) {
        emblaApi.scrollPrev();
      }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [emblaApi]);

  useEffect(() => {
    const overlay = bottomOverlayRef.current;
    if (!overlay) return;

    const updateHeight = () => {
      setBottomOverlayHeight(Math.ceil(overlay.getBoundingClientRect().height));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [activeVideoKey, currentPost]);

  const setVideoRef = useCallback((postId: string, assetId: string, el: HTMLVideoElement | null) => {
    const key = `${postId}:${assetId}`;
    if (el) videoRefs.current.set(key, el);
    else videoRefs.current.delete(key);
  }, []);

  const handleActiveAssetChange = useCallback((postId: string, asset: ImageAsset | undefined) => {
    setActiveAsset((current) => {
      const next = asset
        ? {
            assetId: asset.id,
            isVideo: asset.kind === "video" && Boolean(asset.url),
            postId
          }
        : null;

      if (
        current?.postId === next?.postId &&
        current?.assetId === next?.assetId &&
        current?.isVideo === next?.isVideo
      ) {
        return current;
      }

      return next;
    });
  }, []);

  const toggleCurrentVideo = useCallback(() => {
    const video = activeVideoKey ? videoRefs.current.get(activeVideoKey) : null;
    if (!video) return false;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    return true;
  }, [activeVideoKey]);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  const handleToggleSave = useCallback((post: ImagePost) => {
    const wasSaved = isSaved(post.id);
    haptic("medium");
    onToggleSave(post);
    showToast(wasSaved ? "Retiré des sauvegardes" : "Post sauvegardé");
  }, [isSaved, onToggleSave, showToast]);

  const toggleMute = useCallback(() => {
    haptic("light");
    const video = activeVideoKey ? videoRefs.current.get(activeVideoKey) : null;
    if (video) video.muted = !muted;
    setSetting("viewerMuted", !muted);
  }, [activeVideoKey, muted, setSetting]);

  const handleShare = useCallback(async () => {
    if (!currentPost) return;
    haptic("light");
    const data = {
      title: currentPost.title,
      text: `r/${currentPost.subreddit} — ${currentPost.title}`,
      url: currentPost.permalink
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // dismissed
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(currentPost.permalink);
      } catch {
        // noop
      }
    }
  }, [currentPost]);

  const handleComments = useCallback(() => {
    if (!currentPost) return;
    haptic("light");
    window.open(currentPost.permalink, "_blank", "noopener,noreferrer");
  }, [currentPost]);

  const saved = currentPost ? isSaved(currentPost.id) : false;

  const currentHasVideo = Boolean(activeVideoKey && activeVideo);

  const uiClass = `transition-opacity duration-300 ${
    ui.visible ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  return (
    <div
      ref={viewerRef}
      className="fixed inset-0 z-50 bg-black text-white animate-fade-in"
      onPointerDown={ui.kick}
    >
      <div className="h-[100dvh] w-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full flex-col">
          {posts.map((post, index) => {
            const isCurrent = index === selectedIndex;
            const isNear = Math.abs(index - selectedIndex) <= 1;
            // Render a lightweight placeholder for slides more than 1 position
            // away from the current one.  This avoids mounting Embla carousel
            // instances, video elements and effects for all posts at once (which
            // can be 25+ items).  When the user swipes toward a slide, it
            // becomes "near" one step ahead so its full content is ready.
            if (!isCurrent && !isNear) {
              return (
                <section
                  aria-hidden
                  className="relative h-[100dvh] w-full shrink-0 grow-0 basis-full bg-black"
                  key={post.id}
                />
              );
            }
            return (
              <PostSlide
                isCurrent={isCurrent}
                isNear={isNear}
                key={post.id}
                muted={muted}
                onActiveAssetChange={handleActiveAssetChange}
                onToggleSave={() => handleToggleSave(post)}
                onToggleVideo={toggleCurrentVideo}
                onUnmuteIfMuted={() => {
                  if (muted) {
                    haptic("light");
                    setSetting("viewerMuted", false);
                  }
                }}
                post={post}
                setVideoRef={setVideoRef}
              />
            );
          })}
          {hasMore || isLoadingMore ? (
            <LoadingSlide
              isLoading={isLoadingMore}
              onRetry={onLoadMore}
            />
          ) : posts.length > 0 ? (
            <EndSlide />
          ) : null}
        </div>
      </div>

      {/* Close button — top left */}
      <button
        aria-label="Fermer"
        className={`glass-dark absolute left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-full ${uiClass}`}
        onClick={onClose}
        type="button"
      >
        <X size={16} />
      </button>

      {/* Counter — top center */}
      <p
        className={`pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full glass-dark px-3 py-1 text-[10px] font-medium tabular-nums text-white/50 ${uiClass}`}
      >
        {selectedIndex + 1} / {posts.length}
      </p>

      {/* Toast */}
      {toast ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center animate-fade-in"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md">
            <Check size={13} className="text-accent-300" />
            {toast}
          </span>
        </div>
      ) : null}

      {/* Action column — right side */}
      {currentPost ? (
        <div
          className={`absolute right-3 z-40 ${uiClass}`}
          style={{ bottom: `${bottomOverlayHeight + 12}px` }}
        >
          <ActionColumn
            comments={currentPost.numComments}
            muted={muted}
            onComments={handleComments}
            onMute={currentHasVideo ? undefined : toggleMute}
            onSave={() => handleToggleSave(currentPost)}
            onShare={handleShare}
            saved={saved}
            score={currentPost.score}
          />
        </div>
      ) : null}

      {/* Bottom overlay */}
      {currentPost ? (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 ${uiClass}`}
          ref={bottomOverlayRef}
        >
          {currentHasVideo ? (
            <VideoControls
              muted={muted}
              onToggleMute={toggleMute}
              onTogglePlay={toggleCurrentVideo}
              video={activeVideo}
              videoKey={activeVideoKey}
            />
          ) : null}
          <PostInfo
            onNavigateToSubreddit={onNavigateToSubreddit ? (sub) => { onClose(); onNavigateToSubreddit(sub); } : undefined}
            post={currentPost}
          />
        </div>
      ) : null}
    </div>
  );
}

interface PostSlideProps {
  post: ImagePost;
  isCurrent: boolean;
  isNear: boolean;
  muted: boolean;
  setVideoRef: (postId: string, assetId: string, el: HTMLVideoElement | null) => void;
  onActiveAssetChange: (postId: string, asset: ImageAsset | undefined) => void;
  onToggleSave: () => void;
  onToggleVideo: () => boolean;
  onUnmuteIfMuted: () => void;
}

function PostSlide({
  post,
  isCurrent,
  isNear,
  muted,
  setVideoRef,
  onActiveAssetChange,
  onToggleSave,
  onToggleVideo,
  onUnmuteIfMuted
}: PostSlideProps) {
  const hasGallery = post.assets.length > 1;
  const [assetIndex, setAssetIndex] = useState(0);
  const [galleryEmbla, galleryApi] = useEmblaCarousel({ axis: "x", loop: false });
  const [feedbackIcon, setFeedbackIcon] = useState<"play" | "pause" | "heart" | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const lastTapRef = useRef<{ time: number } | null>(null);

  useEffect(() => {
    if (!galleryApi) return;
    const onSel = () => setAssetIndex(galleryApi.selectedScrollSnap());
    onSel();
    galleryApi.on("select", onSel);
    galleryApi.on("reInit", onSel);
    return () => {
      galleryApi.off("select", onSel);
      galleryApi.off("reInit", onSel);
    };
  }, [galleryApi]);

  const flashFeedback = useCallback((icon: "play" | "pause" | "heart") => {
    setFeedbackIcon(icon);
    setFeedbackKey((value) => value + 1);
    window.setTimeout(() => setFeedbackIcon(null), 650);
  }, []);

  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && now - last.time < 280) {
      lastTapRef.current = null;
      onToggleSave();
      flashFeedback("heart");
      return;
    }
    lastTapRef.current = { time: now };
    window.setTimeout(() => {
      if (lastTapRef.current?.time !== now) return;
      lastTapRef.current = null;
      if (muted) {
        onUnmuteIfMuted();
      }
      const currentAsset = post.assets[assetIndex];
      if (currentAsset?.kind === "video" && currentAsset.url) {
        const toggled = onToggleVideo();
        if (toggled) {
          flashFeedback("play");
        }
      }
    }, 280);
  }, [assetIndex, flashFeedback, muted, onToggleSave, onToggleVideo, onUnmuteIfMuted, post.assets]);

  const currentAsset = post.assets[assetIndex];

  useEffect(() => {
    if (isCurrent) onActiveAssetChange(post.id, currentAsset);
  }, [currentAsset, isCurrent, onActiveAssetChange, post.id]);

  return (
    <section className="relative h-[100dvh] w-full shrink-0 grow-0 basis-full bg-black">
      {hasGallery ? (
        <div className="h-full w-full overflow-hidden" ref={galleryEmbla}>
          <div className="flex h-full">
            {post.assets.map((asset, index) => (
              <AssetView
                asset={asset}
                isActive={isCurrent && index === assetIndex}
                isNear={isNear}
                key={asset.id}
                muted={muted}
                onTap={handleMediaTap}
                postId={post.id}
                setVideoRef={setVideoRef}
              />
            ))}
          </div>
        </div>
      ) : (
        <AssetView
          asset={post.assets[0]}
          isActive={isCurrent}
          isNear={isNear}
          muted={muted}
          onTap={handleMediaTap}
          postId={post.id}
          setVideoRef={setVideoRef}
        />
      )}

      {hasGallery ? (
        <div className="pointer-events-none absolute bottom-40 left-0 right-0 flex items-center justify-center gap-1.5">
          {post.assets.map((_, index) => (
            <span
              className={`h-1.5 rounded-full transition-all duration-200 ${
                index === assetIndex ? "w-4 bg-accent-400" : "w-1.5 bg-white/25"
              }`}
              key={index}
            />
          ))}
        </div>
      ) : null}

      {feedbackIcon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
          key={feedbackKey}
        >
          {feedbackIcon === "heart" ? (
            <Heart
              className="text-accent-300 drop-shadow-[0_0_25px_rgba(56,189,248,0.85)] animate-heart-pop"
              fill="currentColor"
              size={96}
            />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-black/65 animate-scale-in">
              {feedbackIcon === "pause" ? (
                <Pause fill="currentColor" size={36} />
              ) : (
                <Play fill="currentColor" size={36} />
              )}
            </span>
          )}
        </span>
      ) : null}
    </section>
  );
}

interface AssetViewProps {
  asset: ImageAsset | undefined;
  isActive: boolean;
  isNear: boolean;
  muted: boolean;
  postId: string;
  onTap: () => void;
  setVideoRef: (postId: string, assetId: string, el: HTMLVideoElement | null) => void;
}

function AssetView({
  asset,
  isActive,
  isNear,
  muted,
  postId,
  onTap,
  setVideoRef
}: AssetViewProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // When a slide is no longer near or active, explicitly free its video buffer
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || isNear || isActive) return;
    video.pause();
    video.load();
  }, [isNear, isActive]);

  if (!asset) {
    return <div className="flex h-full w-full shrink-0 grow-0 basis-full bg-black" />;
  }

  if (asset.kind === "video" && asset.url) {
    return (
      <div
        className="relative flex h-full w-full shrink-0 grow-0 basis-full items-center justify-center"
        onClick={onTap}
      >
        <BlurredBackdrop src={asset.previewUrl ?? asset.url} />
        <video
          autoPlay={isActive}
          className="relative z-10 max-h-full max-w-full"
          controlsList="nodownload noremoteplayback noplaybackrate nofullscreen"
          data-key={`${postId}:${asset.id}`}
          disablePictureInPicture
          disableRemotePlayback
          loop
          muted={muted}
          playsInline
          poster={asset.previewUrl}
          preload={isActive ? "auto" : isNear ? "metadata" : "none"}
          ref={(el) => {
            localVideoRef.current = el;
            setVideoRef(postId, asset.id, el);
          }}
          src={isNear || isActive ? asset.url : undefined}
        />
      </div>
    );
  }

  if (asset.kind === "video") {
    return (
      <div className="flex h-full w-full shrink-0 grow-0 basis-full items-center justify-center px-6">
        <div className="glass flex max-w-[300px] flex-col items-center gap-3 rounded-3xl p-5 text-center">
          <p className="text-sm font-semibold">Vidéo Redgifs indisponible</p>
          <p className="text-xs text-white/55">
            Redgifs n'a pas fourni de source lisible pour cette vidéo.
          </p>
          {asset.externalUrl ? (
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-400 px-4 py-2 text-sm font-bold text-surface-950 shadow-glow-accent"
              href={asset.externalUrl}
              rel="noreferrer"
              target="_blank"
            >
              Ouvrir Redgifs
              <ExternalLink size={15} />
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full shrink-0 grow-0 basis-full items-center justify-center"
      onClick={onTap}
    >
      <BlurredBackdrop src={asset.previewUrl ?? asset.url} />
      <ZoomableImage src={asset.url} />
    </div>
  );
}

function ZoomableImage({ src }: { src: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <TransformWrapper
      centerOnInit
      doubleClick={{ disabled: true }}
      maxScale={5}
      minScale={1}
      onTransformed={(_, state) => setZoomed(state.scale > 1.05)}
      panning={{ disabled: !zoomed }}
      wheel={{ disabled: true }}
    >
      <TransformComponent
        contentClass="!h-full !w-full !relative !z-10"
        wrapperClass="!h-full !w-full"
        wrapperStyle={{ touchAction: "none" }}
      >
        <img
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
          src={src}
        />
      </TransformComponent>
    </TransformWrapper>
  );
}

function BlurredBackdrop({ src }: { src: string }) {
  if (!src) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className="h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        src={src}
      />
    </div>
  );
}

interface ActionColumnProps {
  saved: boolean;
  muted: boolean;
  score: number;
  comments: number;
  onSave: () => void;
  onShare: () => void;
  onComments: () => void;
  onMute?: () => void;
}

function ActionColumn({
  saved,
  muted,
  score,
  comments,
  onSave,
  onShare,
  onComments,
  onMute
}: ActionColumnProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <ActionButton
        active={saved}
        icon={<Bookmark fill={saved ? "currentColor" : "none"} size={17} />}
        onClick={onSave}
      />
      <div className="flex flex-col items-center gap-0.5">
        <ActionButton
          icon={<MessageCircle size={17} />}
          onClick={onComments}
        />
        <span className="text-[10px] tabular-nums text-white/40">{formatCount(comments)}</span>
      </div>
      <ActionButton icon={<Share2 size={17} />} onClick={onShare} />
      {onMute ? (
        <ActionButton
          icon={muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          onClick={onMute}
        />
      ) : null}
      <div className="mt-1 flex flex-col items-center gap-0.5">
        <ArrowUp size={11} strokeWidth={2.5} className="text-white/35" />
        <span className="text-[10px] font-semibold tabular-nums text-white/50">{formatCount(score)}</span>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  active?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

function ActionButton({ active, icon, onClick }: ActionButtonProps) {
  return (
    <button
      className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 transition-transform active:scale-90 ${
        active
          ? "bg-accent-400/20 text-accent-300 ring-accent-400/40"
          : "bg-white/[0.08] text-white/80 ring-white/10"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      {icon}
    </button>
  );
}

interface PostInfoProps {
  post: ImagePost;
  onNavigateToSubreddit?: (subreddit: string) => void;
}

function PostInfo({ post, onNavigateToSubreddit }: PostInfoProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="pointer-events-none bg-gradient-to-t from-black via-black/65 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
      <div className="flex max-w-full flex-col gap-2 pr-16">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {onNavigateToSubreddit ? (
            <button
              className="pointer-events-auto inline-flex max-w-[170px] items-center rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold text-accent-200 ring-1 ring-white/10 backdrop-blur-md active:scale-95"
              onClick={() => { haptic("light"); onNavigateToSubreddit(post.subreddit); }}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              <span className="truncate">r/{post.subreddit}</span>
            </button>
          ) : (
            <span className="inline-flex max-w-[170px] items-center rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold text-accent-200 ring-1 ring-white/10 backdrop-blur-md">
              <span className="truncate">r/{post.subreddit}</span>
            </span>
          )}
          {post.author && post.author !== "unknown" ? (
            <span className="min-w-0 max-w-[150px] truncate text-[11px] font-medium text-white/50">
              u/{post.author}
            </span>
          ) : null}
          {post.nsfw ? (
            <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200 ring-1 ring-red-300/20">
              NSFW
            </span>
          ) : null}
        </div>
        <p
          className={`text-[15px] font-semibold leading-[1.3] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.75)] ${
            expanded ? "" : "line-clamp-2"
          }`}
        >
          {post.title}
        </p>
        {post.title.length > 80 ? (
          <button
            className="pointer-events-auto w-fit text-[11px] font-semibold text-white/60 active:text-white"
            onClick={(event) => {
              event.stopPropagation();
              haptic("light");
              setExpanded((v) => !v);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            {expanded ? "Réduire" : "Voir plus"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface VideoControlsProps {
  muted: boolean;
  onToggleMute: () => void;
  onTogglePlay: () => boolean;
  video: HTMLVideoElement | null;
  videoKey: string | null;
}

function VideoControls({ muted, onToggleMute, onTogglePlay, video, videoKey }: VideoControlsProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!video) {
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      return;
    }

    const syncState = () => {
      setIsPlaying(!video.paused);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setCurrentTime(video.currentTime);
        setDuration(video.duration);
        if (!draggingRef.current) {
          setProgress((video.currentTime / video.duration) * 100);
        }
      }
    };

    let rafId = 0;
    const tick = () => {
      syncState();
      if (!video.paused && !video.ended) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const onPlay = () => { setIsPlaying(true); rafId = window.requestAnimationFrame(tick); };
    const onPause = () => { setIsPlaying(false); window.cancelAnimationFrame(rafId); syncState(); };
    const onSeeked = () => syncState();
    const onTimeUpdate = () => syncState();
    const onDurationChange = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
      syncState();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onDurationChange);
    video.addEventListener("durationchange", onDurationChange);

    if (!video.paused && !video.ended) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      syncState();
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onDurationChange);
      video.removeEventListener("durationchange", onDurationChange);
    };
  }, [video, videoKey]);

  const scrubTo = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container || !video) return;
      const rect = container.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = ratio * video.duration;
        setProgress(ratio * 100);
        setCurrentTime(ratio * video.duration);
      }
    },
    [video]
  );

  return (
    <div
      className="pointer-events-auto px-4 pb-0 pt-2"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ touchAction: "none" }}
    >
      <div className="flex min-h-9 items-center gap-2">
        <button
          aria-label={isPlaying ? "Pause" : "Lecture"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/65 transition-[background-color,color,transform] active:scale-95 active:bg-white/10 active:text-white"
          onClick={(event) => {
            event.stopPropagation();
            onTogglePlay();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          {isPlaying ? <Pause fill="currentColor" size={14} /> : <Play fill="currentColor" size={14} />}
        </button>

        <div
          className="relative h-9 min-w-0 flex-1 cursor-pointer"
          onPointerCancel={(event) => {
            event.stopPropagation();
            draggingRef.current = false;
            setIsScrubbing(false);
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            draggingRef.current = true;
            setIsScrubbing(true);
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // Capture can fail if the pointer has already been released.
            }
            scrubTo(event.clientX);
          }}
          onPointerMove={(event) => {
            if (!draggingRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            scrubTo(event.clientX);
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            event.stopPropagation();
            draggingRef.current = false;
            setIsScrubbing(false);
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
              // Already released.
            }
          }}
          ref={containerRef}
          style={{ touchAction: "none" }}
        >
          <div
            className={`absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white/12 transition-[height,background-color] ${
              isScrubbing ? "h-[3px] bg-white/18" : "h-0.5"
            }`}
          >
            <div
              className="h-full rounded-full bg-accent-300/80"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {duration > 0 ? (
          <span className="w-[58px] shrink-0 text-right text-[9px] tabular-nums text-white/38">
            {formatTime(currentTime)}
            <span className="text-white/18"> / </span>
            {formatTime(duration)}
          </span>
        ) : null}

        <button
          aria-label={muted ? "Activer le son" : "Couper le son"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/65 transition-[background-color,color,transform] active:scale-95 active:bg-white/10 active:text-white"
          onClick={(event) => {
            event.stopPropagation();
            onToggleMute();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
    </div>
  );
}

interface LoadingSlideProps {
  isLoading: boolean;
  onRetry: () => void;
}

function LoadingSlide({ isLoading, onRetry }: LoadingSlideProps) {
  return (
    <section className="relative flex h-[100dvh] w-full shrink-0 grow-0 basis-full flex-col items-center justify-center gap-4 bg-black text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-accent-400/40 bg-white/5 text-accent-300 animate-pulse-glow">
        <Loader2 className={isLoading ? "animate-spin" : ""} size={28} />
      </span>
      <div>
        <p className="text-base font-semibold tracking-tight text-white">
          {isLoading ? "Chargement de la suite…" : "Suite à charger"}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {isLoading ? "Une salve de posts arrive." : "Tap pour récupérer la suite manuellement."}
        </p>
      </div>
      {!isLoading ? (
        <button
          className="rounded-full bg-accent-400 px-5 py-2 text-sm font-bold text-surface-950 shadow-glow-accent-strong"
          onClick={onRetry}
          type="button"
        >
          Charger plus
        </button>
      ) : null}
    </section>
  );
}

function EndSlide() {
  return (
    <section className="relative flex h-[100dvh] w-full shrink-0 grow-0 basis-full flex-col items-center justify-center gap-3 bg-black text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60">
        <Heart size={26} />
      </span>
      <div>
        <p className="text-base font-semibold tracking-tight text-white">Fin du feed</p>
        <p className="mt-1 max-w-[260px] text-xs text-white/50">
          Tu as parcouru tous les posts. Reviens à la grille pour changer de tri ou de subreddit.
        </p>
      </div>
    </section>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
