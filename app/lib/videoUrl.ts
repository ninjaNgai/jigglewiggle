/**
 * Multi-platform video URL parser.
 * Supports: YouTube (landscape), YouTube Shorts (vertical), TikTok (vertical).
 */

export type VideoPlatform = "youtube" | "youtube_shorts" | "tiktok";

export type VideoSource = {
  platform: VideoPlatform;
  /** Stable cache key used for file storage and localStorage caching */
  videoId: string;
  /** Full URL passed directly to yt-dlp */
  videoUrl: string;
  /** True for TikTok and YouTube Shorts (9:16 portrait) */
  isVertical: boolean;
};

/**
 * Parse any supported video URL and return a VideoSource descriptor.
 * Returns null if the URL is not a recognized video platform URL.
 */
export function parseVideoUrl(url: string): VideoSource | null {
  if (!url) return null;
  const trimmed = url.trim();

  // ── YouTube Shorts ──────────────────────────────────────────────────────────
  // https://youtube.com/shorts/AbCd1234567
  const shortsMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  );
  if (shortsMatch) {
    return {
      platform: "youtube_shorts",
      videoId: shortsMatch[1],
      videoUrl: `https://www.youtube.com/shorts/${shortsMatch[1]}`,
      isVertical: true,
    };
  }

  // ── YouTube standard (watch, embed, youtu.be) ───────────────────────────────
  const ytWatchMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*[?&]v=([a-zA-Z0-9_-]{11})/
  );
  if (ytWatchMatch) {
    return {
      platform: "youtube",
      videoId: ytWatchMatch[1],
      videoUrl: `https://www.youtube.com/watch?v=${ytWatchMatch[1]}`,
      isVertical: false,
    };
  }

  const ytEmbedMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  );
  if (ytEmbedMatch) {
    return {
      platform: "youtube",
      videoId: ytEmbedMatch[1],
      videoUrl: `https://www.youtube.com/watch?v=${ytEmbedMatch[1]}`,
      isVertical: false,
    };
  }

  const ytShortLinkMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/
  );
  if (ytShortLinkMatch) {
    return {
      platform: "youtube",
      videoId: ytShortLinkMatch[1],
      videoUrl: `https://www.youtube.com/watch?v=${ytShortLinkMatch[1]}`,
      isVertical: false,
    };
  }

  // ── TikTok full URL ─────────────────────────────────────────────────────────
  // https://www.tiktok.com/@username/video/7234567890123456789
  const tiktokFullMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+)/
  );
  if (tiktokFullMatch) {
    return {
      platform: "tiktok",
      videoId: `tt_${tiktokFullMatch[1]}`,
      videoUrl: trimmed.split("?")[0], // strip query params for cleaner URL
      isVertical: true,
    };
  }

  // ── TikTok short links ──────────────────────────────────────────────────────
  // https://vm.tiktok.com/ZMFxxxxxxx/ or https://www.tiktok.com/t/ZT8xxxxxxxx/
  const tiktokShortMatch = trimmed.match(
    /(?:https?:\/\/)?(?:vm\.tiktok\.com\/|(?:www\.)?tiktok\.com\/t\/)([A-Za-z0-9]+)/
  );
  if (tiktokShortMatch) {
    return {
      platform: "tiktok",
      videoId: `tt_s_${tiktokShortMatch[1]}`,
      videoUrl: trimmed,
      isVertical: true,
    };
  }

  return null;
}

/** Returns true if the platform typically produces vertical (portrait) video. */
export function isVerticalPlatform(platform: VideoPlatform): boolean {
  return platform === "tiktok" || platform === "youtube_shorts";
}

/** Human-readable platform label. */
export function platformLabel(platform: VideoPlatform): string {
  switch (platform) {
    case "youtube": return "YouTube";
    case "youtube_shorts": return "YouTube Shorts";
    case "tiktok": return "TikTok";
  }
}
