import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { ImageAsset, ImagePost } from "../types/reddit";

interface ImageViewerProps {
  posts: ImagePost[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageViewer({ posts, initialIndex, onClose }: ImageViewerProps) {
  const slides = useMemo(() => flattenPosts(posts), [posts]);
  const initialSlide = useMemo(
    () => posts.slice(0, initialIndex).reduce((total, post) => total + post.assets.length, 0),
    [initialIndex, posts]
  );
  const [selectedIndex, setSelectedIndex] = useState(initialSlide);
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: initialSlide, loop: false });
  const currentSlide = slides[selectedIndex] ?? slides[initialSlide];

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    const nearbyIndexes = [selectedIndex - 1, selectedIndex + 1].filter(
      (index) => index >= 0 && index < slides.length
    );

    nearbyIndexes.forEach((index) => {
      const asset = slides[index]?.asset;
      if (asset.kind === "image") {
        const image = new Image();
        image.src = asset.url;
      }
    });
  }, [selectedIndex, slides]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft") {
        scrollPrev();
      }
      if (event.key === "ArrowRight") {
        scrollNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, scrollNext, scrollPrev]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{currentSlide?.post.title}</p>
          <p className="truncate text-xs text-moss-100/70">
            r/{currentSlide?.post.subreddit}
            {currentSlide?.galleryPosition ? ` - ${currentSlide.galleryPosition}` : ""}
          </p>
        </div>
        <button
          aria-label="Fermer"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {slides.map(({ post, asset, galleryPosition }) => (
            <div className="min-w-0 flex-[0_0_100%]" key={`${post.id}-${asset.id}`}>
              <div className="flex h-full items-center justify-center">
                {asset.kind === "video" && asset.url ? (
                  <video
                    className="max-h-full max-w-full"
                    controls
                    loop
                    playsInline
                    poster={asset.previewUrl}
                    src={asset.url}
                  />
                ) : asset.kind === "video" ? (
                  <div className="flex max-w-[300px] flex-col items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-sm font-semibold">Video Redgifs indisponible</p>
                    <p className="text-xs text-moss-100/65">
                      Redgifs n'a pas fourni de source lisible pour cette video.
                    </p>
                    {asset.externalUrl ? (
                      <a
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                        href={asset.externalUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ouvrir Redgifs
                        <ExternalLink size={15} />
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <TransformWrapper centerOnInit maxScale={5} minScale={1} wheel={{ disabled: true }}>
                    <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
                      <img
                        alt={galleryPosition ? `${post.title} ${galleryPosition}` : post.title}
                        className="h-full w-full object-contain"
                        draggable={false}
                        src={asset.url}
                      />
                    </TransformComponent>
                  </TransformWrapper>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-14 left-0 right-0 flex items-center justify-between px-2">
        <button
          aria-label="Image precedente"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45"
          onClick={scrollPrev}
          type="button"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          aria-label="Image suivante"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45"
          onClick={scrollNext}
          type="button"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}

interface ViewerSlide {
  post: ImagePost;
  asset: ImageAsset;
  galleryPosition: string | null;
}

function flattenPosts(posts: ImagePost[]): ViewerSlide[] {
  return posts.flatMap((post) =>
    post.assets.map((asset, index) => ({
      post,
      asset,
      galleryPosition: post.assets.length > 1 ? `${index + 1}/${post.assets.length}` : null
    }))
  );
}
