import { NextRequest } from "next/server";
import { spawn, execFile } from "child_process";
import { mkdir, access } from "fs/promises";
import path from "path";
import { classifyVideo } from "../../lib/classifyVideo";

const VIDEO_DIR = "/tmp/jigglewiggle";

/** Free-tier max duration in seconds. Premium users have no limit. */
const FREE_TIER_MAX_SECONDS = 30;

/**
 * Validate a video ID / cache key.
 * Accepts:
 *   - YouTube 11-char IDs:          [a-zA-Z0-9_-]{11}
 *   - TikTok full IDs:              tt_<digits>
 *   - TikTok short-link IDs:        tt_s_<alphanum>
 *   - AI-generated IDs (gen_ prefix used by /api/generate):  gen_<uuid>
 */
function isValidVideoId(id: string): boolean {
  return (
    /^[a-zA-Z0-9_-]{11}$/.test(id) ||        // YouTube
    /^tt_\d+$/.test(id) ||                    // TikTok full
    /^tt_s_[A-Za-z0-9]+$/.test(id) ||        // TikTok short
    /^gen_[a-zA-Z0-9_-]+$/.test(id)          // AI-generated
  );
}

/**
 * Fetch video metadata via yt-dlp and classify dance vs gym.
 * For TikTok, defaults to "dance" without network call since TikTok is
 * always dance content in this app context.
 */
async function classifyFromMetadata(
  videoId: string,
  videoUrl: string
): Promise<string> {
  // TikTok is always dance — skip classification network call
  if (videoId.startsWith("tt_")) {
    // Extract a title from the URL if possible
    const titleMatch = videoUrl.match(/tiktok\.com\/@([^/]+)/);
    const title = titleMatch ? `@${titleMatch[1]} on TikTok` : "TikTok video";
    return `data: ${JSON.stringify({ type: "classified", mode: "dance", title })}\n\n`;
  }

  return new Promise((resolve) => {
    execFile(
      "yt-dlp",
      ["--dump-json", "--no-download", videoUrl],
      { maxBuffer: 10 * 1024 * 1024 },
      async (err, stdout) => {
        if (err || !stdout) {
          resolve(
            `data: ${JSON.stringify({ type: "classified", mode: "dance", title: "" })}\n\n`
          );
          return;
        }
        try {
          const meta = JSON.parse(stdout);
          const title: string = meta.title ?? "";
          const description: string = meta.description ?? "";
          const mode = await classifyVideo(title, description);
          resolve(
            `data: ${JSON.stringify({ type: "classified", mode, title })}\n\n`
          );
        } catch {
          resolve(
            `data: ${JSON.stringify({ type: "classified", mode: "dance", title: "" })}\n\n`
          );
        }
      }
    );
  });
}

/**
 * Get the duration (in seconds) of a video via yt-dlp --dump-json.
 * Returns null if duration cannot be determined.
 */
async function getVideoDuration(videoUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    execFile(
      "yt-dlp",
      ["--dump-json", "--no-download", videoUrl],
      { maxBuffer: 10 * 1024 * 1024, timeout: 15_000 },
      (err, stdout) => {
        if (err || !stdout) { resolve(null); return; }
        try {
          const meta = JSON.parse(stdout);
          resolve(typeof meta.duration === "number" ? meta.duration : null);
        } catch {
          resolve(null);
        }
      }
    );
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    videoId: string;
    videoUrl: string;
    isPremium?: boolean;
  };

  const { videoId, videoUrl, isPremium = false } = body;

  if (!videoId || !isValidVideoId(videoId)) {
    return new Response(
      JSON.stringify({ error: "Invalid video ID" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!videoUrl || typeof videoUrl !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing videoUrl" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  await mkdir(VIDEO_DIR, { recursive: true });

  const outputPath = path.join(VIDEO_DIR, `${videoId}.mp4`);

  // Check if already downloaded
  try {
    await access(outputPath);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", percent: 100 })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        const classifiedLine = await classifyFromMetadata(videoId, videoUrl);
        controller.enqueue(encoder.encode(classifiedLine));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    // File doesn't exist — proceed with download
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (data: string) => {
        if (!closed) controller.enqueue(encoder.encode(data));
      };
      const safeClose = () => {
        if (!closed) { closed = true; controller.close(); }
      };

      // ── Duration check for free tier ────────────────────────────────────────
      // Run in parallel with download start for non-TikTok (TikTok metadata
      // fetch is slow); for TikTok we skip it since we default to dance anyway.
      const durationCheckPromise: Promise<number | null> = isPremium
        ? Promise.resolve(null) // premium: skip check
        : getVideoDuration(videoUrl);

      // Launch classification in parallel
      const classifyPromise = classifyFromMetadata(videoId, videoUrl);

      // Choose yt-dlp format based on platform:
      // - TikTok/Shorts (vertical): prefer best available without re-encoding
      // - YouTube landscape: prefer mp4 with best quality
      const isTikTok = videoId.startsWith("tt_");
      const formatArgs = isTikTok
        ? ["-f", "best", "--merge-output-format", "mp4"]
        : ["-f", "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best", "--merge-output-format", "mp4"];

      const proc = spawn("yt-dlp", [
        ...formatArgs,
        "-o", outputPath,
        "--newline",
        videoUrl,
      ]);

      let stderrBuf = "";
      let downloadedSeconds = 0; // track for duration-based limit enforcement

      proc.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        const match = text.match(/\[download\]\s+([\d.]+)%/);
        if (match) {
          const percent = parseFloat(match[1]);
          safeEnqueue(`data: ${JSON.stringify({ type: "progress", percent })}\n\n`);

          // For free-tier duration enforcement: if we've confirmed the video
          // exceeds the limit and are partway through, abort early.
          if (!isPremium && downloadedSeconds > FREE_TIER_MAX_SECONDS) {
            proc.kill("SIGTERM");
          }
        }
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderrBuf += data.toString();
      });

      proc.on("error", (err) => {
        safeEnqueue(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
        safeClose();
      });

      proc.on("close", async (code) => {
        if (code === 0) {
          // Check duration for free-tier after successful download
          if (!isPremium) {
            const duration = await durationCheckPromise;
            if (duration !== null && duration > FREE_TIER_MAX_SECONDS) {
              // Delete the file so it's not cached
              try {
                const { unlink } = await import("fs/promises");
                await unlink(outputPath);
              } catch { /* ignore */ }
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: "error",
                  code: "DURATION_LIMIT",
                  message: `Free tier is limited to ${FREE_TIER_MAX_SECONDS}s videos. This video is ${Math.round(duration)}s. Upgrade to Premium for unlimited length.`,
                  duration: Math.round(duration),
                  limitSeconds: FREE_TIER_MAX_SECONDS,
                })}\n\n`
              );
              safeClose();
              return;
            }
          }

          safeEnqueue(`data: ${JSON.stringify({ type: "done" })}\n\n`);
          try {
            const classifiedLine = await classifyPromise;
            safeEnqueue(classifiedLine);
          } catch {
            safeEnqueue(`data: ${JSON.stringify({ type: "classified", mode: "dance", title: "" })}\n\n`);
          }
        } else {
          safeEnqueue(
            `data: ${JSON.stringify({ type: "error", message: stderrBuf.slice(-500) || `yt-dlp exited with code ${code}` })}\n\n`
          );
        }
        safeClose();
      });

      // Store reference to proc for cleanup (unused but satisfies TS)
      void downloadedSeconds;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
