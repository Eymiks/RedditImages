import type { ImageAsset, ImagePost, RedditPostData } from "../types/reddit";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
type GalleryMetadata = NonNullable<RedditPostData["media_metadata"]>[string];

export interface NormalizeOptions {
  allowNsfw?: boolean;
}

export function normalizePosts(
  posts: RedditPostData[],
  options: NormalizeOptions = {}
): ImagePost[] {
  const { allowNsfw = true } = options;
  return posts.flatMap((post) => {
    if (!allowNsfw && post.over_18) {
      return [];
    }
    const assets = extractAssets(post);
    if (assets.length === 0) {
      return [];
    }

    return [
      {
        id: post.id,
        title: post.title,
        subreddit: post.subreddit,
        permalink: `https://www.reddit.com${post.permalink}`,
        nsfw: Boolean(post.over_18),
        score: post.score ?? 0,
        numComments: post.num_comments ?? 0,
        author: post.author ?? "unknown",
        assets
      }
    ];
  });
}

export function decodeRedditUrl(url: string): string {
  return url.replaceAll("&amp;", "&").replaceAll("\\u0026", "&");
}

function extractAssets(post: RedditPostData): ImageAsset[] {
  const vredditAssets = extractRedditVideoAsset(post);
  if (vredditAssets.length > 0) return vredditAssets;

  const postUrl = post.url_overridden_by_dest ?? post.url;
  const redgifsId = postUrl ? parseRedgifsId(postUrl) : null;
  if (redgifsId && postUrl) {
    const previewUrl = pickPostPreview(post) ?? "";
    return [
      {
        id: `${post.id}-redgifs-${redgifsId}`,
        url: "",
        previewUrl,
        kind: "video",
        source: "redgifs",
        externalUrl: normalizeMediaUrl(postUrl),
        redgifsId
      }
    ];
  }

  if (post.is_gallery && post.gallery_data?.items && post.media_metadata) {
    return post.gallery_data.items.flatMap((item, index) => {
      const metadata = post.media_metadata?.[item.media_id];
      const url = pickGalleryUrl(metadata);
      if (!url) {
        return [];
      }
      return [makeAsset(`${post.id}-${item.media_id}-${index}`, url, pickPreviewUrl(metadata) ?? url)];
    });
  }

  const directUrl = postUrl ? normalizeMediaUrl(postUrl) : null;
  const previewUrl = pickPostPreview(post);

  if (directUrl && (isImageUrl(directUrl) || isVideoUrl(directUrl))) {
    return [makeAsset(`${post.id}-direct`, directUrl, previewUrl ?? directUrl)];
  }

  if (post.post_hint === "image" && previewUrl) {
    return [makeAsset(`${post.id}-preview`, previewUrl, previewUrl)];
  }

  return [];
}

function extractRedditVideoAsset(post: RedditPostData): ImageAsset[] {
  if (!post.is_video && !post.url?.includes("v.redd.it") && post.domain !== "v.redd.it") {
    return [];
  }
  const video = post.secure_media?.reddit_video ?? post.media?.reddit_video;
  const hlsUrl = video?.hls_url;
  const fallbackUrl = video?.fallback_url;
  const url = hlsUrl ?? fallbackUrl;
  if (!url) return [];

  const previewUrl = pickPostPreview(post) ?? (fallbackUrl ? decodeRedditUrl(fallbackUrl) : "");
  return [
    {
      id: `${post.id}-vreddit`,
      url: decodeRedditUrl(url),
      previewUrl,
      kind: "video",
      source: "vreddit",
      hlsUrl: hlsUrl ? decodeRedditUrl(hlsUrl) : undefined,
      externalUrl: `https://www.reddit.com${post.permalink}`
    }
  ];
}

function pickPostPreview(post: RedditPostData): string | null {
  const image = post.preview?.images?.[0];
  const largestResolution = image?.resolutions?.at(-1)?.url;
  const source = image?.source?.url;
  return normalizeMaybeUrl(largestResolution ?? source);
}

function pickGalleryUrl(metadata: GalleryMetadata | undefined): string | null {
  if (!metadata || metadata.status === "failed") {
    return null;
  }

  return normalizeMaybeUrl(metadata.s?.u ?? metadata.s?.gif ?? metadata.s?.mp4 ?? metadata.p?.at(-1)?.u);
}

function pickPreviewUrl(metadata: GalleryMetadata | undefined): string | null {
  return normalizeMaybeUrl(metadata?.p?.at(-1)?.u ?? metadata?.s?.u);
}

function normalizeMaybeUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  return normalizeMediaUrl(url);
}

function normalizeMediaUrl(url: string): string {
  const decoded = decodeRedditUrl(url);
  if (decoded.includes("imgur.com") && decoded.endsWith(".gifv")) {
    return `${decoded.slice(0, -5)}.mp4`;
  }
  return decoded;
}

function makeAsset(id: string, url: string, previewUrl: string): ImageAsset {
  return {
    id,
    url,
    previewUrl,
    kind: isVideoUrl(url) ? "video" : "image",
    source: url.includes("imgur.com") ? "imgur" : "reddit"
  };
}

function parseRedgifsId(url: string): string | null {
  try {
    const parsed = new URL(decodeRedditUrl(url));
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith("redgifs.com")) {
      return null;
    }

    const [section, id] = parsed.pathname.split("/").filter(Boolean);
    if (!id || !["watch", "ifr", "embed"].includes(section?.toLowerCase())) {
      return null;
    }

    return id.replace(/[^a-z0-9-]/gi, "");
  } catch {
    return null;
  }
}

function isImageUrl(url: string): boolean {
  const cleanUrl = stripQuery(url).toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => cleanUrl.endsWith(extension));
}

function isVideoUrl(url: string): boolean {
  return stripQuery(url).toLowerCase().endsWith(".mp4");
}

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0].replace(/\.jpeg$/i, ".jpg");
}
