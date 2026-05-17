export type SortName = "hot" | "new" | "top";
export type TopPeriod = "day" | "week" | "month" | "year" | "all";

export type FeedTab = "subreddits" | "favorites" | "multi" | "saved";

export type FeedTarget =
  | { kind: "subreddit"; name: string }
  | { kind: "multi"; id: string; name: string; subreddits: string[] };

export type MediaKind = "image" | "video";
export type MediaSource = "reddit" | "imgur" | "redgifs";

export interface ImageAsset {
  id: string;
  url: string;
  previewUrl: string;
  kind: MediaKind;
  source?: MediaSource;
  externalUrl?: string;
  redgifsId?: string;
}

export interface ImagePost {
  id: string;
  title: string;
  subreddit: string;
  permalink: string;
  nsfw: boolean;
  score: number;
  numComments: number;
  author: string;
  assets: ImageAsset[];
}

export interface ListingResult {
  posts: ImagePost[];
  after: string | null;
  notice?: string;
}

export interface RedditListingResponse {
  kind: string;
  data: {
    after: string | null;
    children: Array<{ kind: string; data: RedditPostData }>;
  };
}

export interface RedditPostData {
  id: string;
  title: string;
  subreddit: string;
  permalink: string;
  over_18?: boolean;
  score?: number;
  num_comments?: number;
  author?: string;
  url?: string;
  url_overridden_by_dest?: string;
  domain?: string;
  post_hint?: string;
  is_gallery?: boolean;
  is_video?: boolean;
  preview?: {
    images?: Array<{
      source?: { url?: string; width?: number; height?: number };
      resolutions?: Array<{ url?: string; width?: number; height?: number }>;
    }>;
  };
  gallery_data?: {
    items?: Array<{ media_id: string; id?: number }>;
  };
  media_metadata?: Record<
    string,
    {
      status?: string;
      e?: string;
      m?: string;
      s?: { u?: string; gif?: string; mp4?: string; x?: number; y?: number };
      p?: Array<{ u?: string; x?: number; y?: number }>;
    }
  >;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  username: string;
  avatarUrl: string | null;
}
