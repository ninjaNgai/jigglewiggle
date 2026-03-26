"use client";

import { useState, useEffect } from "react";

type Props = {
  visible: boolean;
  /** Duration in seconds of the video that triggered the paywall (null = generic upgrade). */
  videoDuration: number | null;
  onClose: () => void;
  onUpgradeSuccess: () => void;
};

const FREE_LIMIT_SECONDS = 30;

const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$9.99",
    period: "/mo",
    perks: [
      "Unlimited video length",
      "TikTok & YouTube Shorts",
      "YouTube landscape videos",
      "Shareable score cards",
      "Priority AI coaching",
    ],
  },
  {
    id: "annual",
    label: "Annual",
    price: "$79",
    period: "/yr",
    badge: "Save 34%",
    perks: [
      "Everything in Monthly",
      "Exclusive Kpop move packs",
      "Export session recordings",
      "Early access to new features",
    ],
  },
];

export default function PaywallModal({
  visible,
  videoDuration,
  onClose,
  onUpgradeSuccess,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (visible) {
      setError(null);
      setLoading(false);
    }
  }, [visible]);

  // Handle Stripe checkout redirect return (?premium=true&session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const premiumParam = params.get("premium");
    const sessionId = params.get("session_id");

    if (premiumParam === "true" && sessionId) {
      // Verify session with backend
      fetch(`/api/stripe/subscription?session_id=${sessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.isPremium) {
            onUpgradeSuccess();
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete("premium");
            url.searchParams.delete("session_id");
            window.history.replaceState({}, "", url.toString());
          }
        })
        .catch(() => { /* ignore */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      // Redirect to Stripe hosted checkout
      window.location.href = data.url;
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  if (!visible) return null;

  const isDurationTrigger = videoDuration !== null && videoDuration > FREE_LIMIT_SECONDS;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg border border-neon-cyan/30 bg-[#07071a] rounded-sm overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(0,255,255,0.08), 0 0 120px rgba(184,41,255,0.06)" }}
      >
        {/* Top accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent" />

        <div className="p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div
              className="text-2xl tracking-[0.25em] uppercase neon-text-cyan mb-2"
              style={{ fontFamily: "var(--font-audiowide)" }}
            >
              Go Premium
            </div>
            {isDurationTrigger ? (
              <p className="text-sm text-neon-cyan/50">
                This video is <span className="text-white">{Math.round(videoDuration!)}s</span> — free tier is limited to{" "}
                <span className="text-white">{FREE_LIMIT_SECONDS}s</span>.
                Upgrade to unlock unlimited length.
              </p>
            ) : (
              <p className="text-sm text-neon-cyan/50">
                Unlock TikTok, YouTube Shorts, longer videos, and more.
              </p>
            )}
          </div>

          {/* Plan selector */}
          <div className="flex gap-3 mb-6">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id as "monthly" | "annual")}
                className={`flex-1 p-4 border text-left transition-all relative ${
                  selectedPlan === plan.id
                    ? "border-neon-cyan/60 bg-neon-cyan/8"
                    : "border-neon-cyan/15 hover:border-neon-cyan/30"
                }`}
              >
                {plan.badge && (
                  <span className="absolute top-2 right-2 text-[9px] tracking-widest uppercase px-1.5 py-0.5 bg-yellow-400/20 border border-yellow-400/40 text-yellow-400">
                    {plan.badge}
                  </span>
                )}
                <div
                  className="text-xs tracking-[0.2em] uppercase text-neon-cyan/60 mb-1"
                  style={{ fontFamily: "var(--font-audiowide)" }}
                >
                  {plan.label}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: "var(--font-audiowide)" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-xs text-neon-cyan/40">{plan.period}</span>
                </div>
                <ul className="mt-3 space-y-1">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-1.5">
                      <span className="text-neon-cyan text-xs mt-0.5">✓</span>
                      <span className="text-xs text-white/60">{perk}</span>
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* Email input */}
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email (optional, for receipt)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neon-input w-full px-4 py-2.5 text-sm"
              style={{ fontFamily: "var(--font-chakra-petch)" }}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 mb-3 text-center">{error}</p>
          )}

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full neon-btn py-3 text-sm font-semibold uppercase tracking-[0.15em] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-audiowide)" }}
          >
            {loading ? "Redirecting…" : `Upgrade — ${selectedPlan === "monthly" ? "$9.99/mo" : "$79/yr"}`}
          </button>

          <p className="mt-3 text-center text-[10px] text-neon-cyan/30">
            Cancel anytime · Secure payment via Stripe
          </p>
        </div>

        {/* Bottom accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-violet/40 to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-neon-cyan/40 hover:text-neon-cyan transition-colors text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
