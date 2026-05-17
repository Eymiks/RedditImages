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
}

type VideoRefMap = Map<string, HTMLVideoElement>;

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
  onToggleSave
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
  const currentPost = posts[selectedIndex];
  const ui = useAutoHideUi(3000);

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
      const isCurrent = key.startsWith(`${currentPost.id}:`);
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
  }, [currentPost, muted]);

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

  const setVideoRef = useCallback((postId: string, assetId: string, el: HTMLVideoElement | null) => {
    const key = `${postId}:${assetId}`;
    if (el) videoRefs.current.set(key, el);
    else videoRefs.current.delete(key);
  }, []);

  const toggleCurrentVideo = useCallback(() => {
    if (!currentPost) return false;
    let toggled = false;
    videoRefs.current.forEach((video, key) => {
      if (!key.startsWith(`${currentPost.id}:`)) return;
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
      toggled = true;
    });
    return toggled;
  }, [currentPost]);

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
    setSetting("viewerMuted", !muted);
  }, [muted, setSetting]);

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

  const uiClass = `transition-opacity duration-300 ${
    ui.visible ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white animate-fade-in"
      onPointerDown={ui.kick}
    >
      <div className="h-[100dvh] w-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full flex-col">
          {posts.map((post, index) => (
            <PostSlide
              isCurrent={index === selectedIndex}
              isNear={Math.abs(index - selectedIndex) <= 1}
              key={post.id}
              muted={muted}
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
          ))}
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

      <button
        aria-label="Fermer"
        className={`glass-dark absolute left-3 top-3 z-40 grid h-11 w-11 place-items-center rounded-full ${uiClass}`}
        onClick={onClose}
        type="button"
      >
        <X size={20} />
      </button>

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

      <p
        className={`pointer-events-none absolute right-3 top-3 z-40 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-moss-100/80 backdrop-blur-md ${uiClass}`}
      >
        {selectedIndex + 1} / {posts.length}
      </p>

      {currentPost ? (
        <div className={`absolute bottom-28 right-3 z-40 ${uiClass}`}>
          <ActionColumn
            comments={currentPost.numComments}
            muted={muted}
            onComments={handleComments}
            onMute={toggleMute}
            onSave={() => handleToggleSave(currentPost)}
            onShare={handleShare}
            saved={saved}
            score={currentPost.score}
          />
        </div>
      ) : null}

      {currentPost ? (
        <div className={`absolute inset-x-0 bottom-0 z-30 ${uiClass}`}>
          <PostInfo post={currentPost} />
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
  const showScrub =
    isCurrent && currentAsset?.kind === "video" && Boolean(currentAsset.url);

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
        <div className="pointer-events-none absolute bottom-32 left-0 right-20 flex items-center justify-center gap-1.5">
          {post.assets.map((_, index) => (
            <span
              className={`h-1.5 rounded-full transition-all duration-200 ${
                index === assetIndex ? "w-5 bg-accent-400 shadow-glow-accent" : "w-1.5 bg-white/40"
              }`}
              key={index}
            />
          ))}
        </div>
      ) : null}

      {showScrub && currentAsset ? (
        <VideoProgressBar assetId={currentAsset.id} postId={post.id} />
      ) : null}

      {feedbackIcon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
          key={feedbackKey}
        >
          {feedbackIcon === "heart" ? (
            <Heart
              className="text-accent-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.85)] animate-heart-pop"
              fill="currentColor"
              size={96}
            />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-black/55 backdrop-blur-md animate-fade-in">
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
          <p className="text-xs text-moss-100/65">
            Redgifs n'a pas fourni de source lisible pour cette vidéo.
          </p>
          {asset.externalUrl ? (
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-400 px-4 py-2 text-sm font-bold text-moss-950 shadow-glow-accent"
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
        wrapperStyle={{ touchAction: zoomed ? "none" : "pan-y" }}
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
  onMute: () => void;
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
    <div className="flex flex-col items-center gap-2.5">
      <ActionButton
        active={saved}
        icon={<Bookmark fill={saved ? "currentColor" : "none"} size={18} />}
        onClick={onSave}
      />
      <ActionButton
        count={formatCount(comments)}
        icon={<MessageCircle size={18} />}
        onClick={onComments}
      />
      <ActionButton icon={<Share2 size={18} />} onClick={onShare} />
      <ActionButton
        icon={muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        onClick={onMute}
      />
      <div className="mt-0.5 flex flex-col items-center gap-0.5 rounded-full bg-black/35 px-2 py-1 text-[10px] font-bold tabular-nums backdrop-blur-md">
        <ArrowUp size={12} strokeWidth={2.5} />
        <span>{formatCount(score)}</span>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  active?: boolean;
  count?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function ActionButton({ active, count, icon, onClick }: ActionButtonProps) {
  return (
    <button
      className="flex flex-col items-center gap-0.5 transition-transform active:scale-90"
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-full backdrop-blur-md transition-colors ${
          active ? "bg-accent-400 text-moss-950 shadow-glow-accent-strong" : "bg-black/35 text-white"
        }`}
      >
        {icon}
      </span>
      {count ? (
        <span className="text-[10px] font-semibold tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

interface PostInfoProps {
  post: ImagePost;
}

function PostInfo({ post }: PostInfoProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="pointer-events-none bg-gradient-to-t from-black/55 via-black/10 to-transparent px-3 pb-4 pt-6">
      <div className="mr-20 max-w-full">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          r/{post.subreddit}
          {post.author && post.author !== "unknown" ? ` · u/${post.author}` : ""}
        </p>
        <p
          className={`mt-1 text-sm font-semibold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] ${
            expanded ? "" : "line-clamp-2"
          }`}
        >
          {post.title}
        </p>
        {post.title.length > 80 ? (
          <button
            className="pointer-events-auto mt-1 text-xs font-semibold text-accent-300"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "Réduire" : "Voir plus"}
          </button>
        ) : null}
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
        <p className="mt-1 text-xs text-moss-100/60">
          {isLoading ? "Une salve de posts arrive." : "Tap pour récupérer la suite manuellement."}
        </p>
      </div>
      {!isLoading ? (
        <button
          className="rounded-full bg-accent-400 px-5 py-2 text-sm font-bold text-moss-950 shadow-glow-accent-strong"
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
      <span className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/5 text-moss-100/70">
        <Heart size={26} />
      </span>
      <div>
        <p className="text-base font-semibold tracking-tight text-white">Fin du feed</p>
        <p className="mt-1 max-w-[260px] text-xs text-moss-100/60">
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

interface VideoProgressBarProps {
  postId: string;
  assetId: string;
}

function VideoProgressBar({ postId, assetId }: VideoProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>(
      `video[data-key="${postId}:${assetId}"]`
    );
    if (!video) return;
    videoRef.current = video;

    const syncState = () => {
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

    const onPlay = () => { rafId = window.requestAnimationFrame(tick); };
    const onPause = () => { window.cancelAnimationFrame(rafId); syncState(); };
    const onSeeked = () => syncState();
    const onDurationChange = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
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
      video.removeEventListener("durationchange", onDurationChange);
      videoRef.current = null;
    };
  }, [assetId, postId]);

  const scrubTo = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      const video = videoRef.current;
      if (!container || !video) return;
      const rect = container.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (Number.isFinite(video.duration)) {
        video.currentTime = ratio * video.duration;
        setProgress(ratio * 100);
        setCurrentTime(ratio * video.duration);
      }
    },
    []
  );

  return (
    <div className="absolute bottom-16 left-3 right-20 z-30 flex flex-col gap-1">
      {duration > 0 ? (
        <div className="flex justify-between px-0.5">
          <span className="text-[10px] font-semibold tabular-nums text-white/70 drop-shadow-md">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] font-semibold tabular-nums text-white/45 drop-shadow-md">
            {formatTime(duration)}
          </span>
        </div>
      ) : null}
      <div
        className="h-6"
        onPointerCancel={() => (draggingRef.current = false)}
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          scrubTo(event.clientX);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) scrubTo(event.clientX);
        }}
        onPointerUp={(event) => {
          draggingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        ref={containerRef}
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-accent-400 shadow-glow-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
