"use client";

import { useState, useEffect, useRef } from "react";
import { generateScoreCard } from "../lib/scoreCard";
import type { AppMode } from "../shared/mode";

type Props = {
  visible: boolean;
  score: number;
  grade: string;
  totalPoints: number;
  videoTitle: string;
  mode: AppMode;
  onClose: () => void;
};

export default function ShareScoreModal({
  visible,
  score,
  grade,
  totalPoints,
  videoTitle,
  mode,
  onClose,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasGenerated = useRef(false);

  // Generate the card when the modal opens
  useEffect(() => {
    if (!visible || hasGenerated.current) return;
    hasGenerated.current = true;
    setGenerating(true);
    generateScoreCard({ score, grade, totalPoints, videoTitle, mode })
      .then(({ blob, dataUrl }) => {
        setPreviewUrl(dataUrl);
        setCardBlob(blob);
      })
      .catch((err) => {
        console.error("Score card generation failed:", err);
      })
      .finally(() => setGenerating(false));
  }, [visible, score, grade, totalPoints, videoTitle, mode]);

  // Reset when closed
  useEffect(() => {
    if (!visible) {
      hasGenerated.current = false;
      setPreviewUrl(null);
      setCardBlob(null);
      setCopied(false);
    }
  }, [visible]);

  if (!visible) return null;

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `mustdance-score-${score}.png`;
    a.click();
  };

  const handleNativeShare = async () => {
    if (!cardBlob) return;
    const file = new File([cardBlob], `mustdance-score-${score}.png`, { type: "image/png" });
    const shareText = `I scored ${score} on Must Dance${videoTitle ? ` dancing to "${videoTitle}"` : ""}! Can you beat me? 🕺`;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Must Dance Score", text: shareText, files: [file] });
      } else {
        // Fallback: share without file (copy text)
        await navigator.share({ title: "Must Dance Score", text: shareText });
      }
    } catch (err) {
      // User cancelled or share failed — silently ignore
      console.info("Share cancelled or failed:", err);
    }
  };

  const handleCopyText = async () => {
    const text = `I scored ${score} on Must Dance${videoTitle ? ` dancing to "${videoTitle}"` : ""}! Can you beat me? 🕺 mustdance.app`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm border border-neon-violet/30 bg-[#07071a] rounded-sm overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(184,41,255,0.1)" }}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-violet/60 to-transparent" />

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-5">
            <div
              className="text-xl tracking-[0.25em] uppercase text-neon-violet mb-1"
              style={{ fontFamily: "var(--font-audiowide)" }}
            >
              Share Your Score
            </div>
            <p className="text-xs text-white/40">
              Show the world what you&apos;ve got!
            </p>
          </div>

          {/* Card preview */}
          <div className="mb-5 aspect-square w-full bg-black/50 border border-neon-violet/10 rounded overflow-hidden flex items-center justify-center">
            {generating && (
              <div className="text-xs text-neon-violet/50 tracking-widest uppercase">
                Generating…
              </div>
            )}
            {previewUrl && !generating && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Score card"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={!cardBlob}
                className="w-full neon-btn py-2.5 text-xs uppercase tracking-[0.15em] disabled:opacity-40"
                style={{ fontFamily: "var(--font-audiowide)" }}
              >
                Share to TikTok / Instagram
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={!previewUrl}
              className="w-full py-2.5 text-xs uppercase tracking-[0.15em] border border-neon-violet/30 text-neon-violet/70 hover:text-neon-violet hover:border-neon-violet/60 transition-colors disabled:opacity-40"
              style={{ fontFamily: "var(--font-audiowide)" }}
            >
              Download PNG
            </button>

            <button
              onClick={handleCopyText}
              className="w-full py-2.5 text-xs uppercase tracking-[0.15em] border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
              style={{ fontFamily: "var(--font-audiowide)" }}
            >
              {copied ? "Copied!" : "Copy Caption Text"}
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-white/20">
            Tap the image to preview full resolution
          </p>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-violet/40 to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
