# Must Dance — API Keys Setup Guide

This document explains every third-party credential the app uses, what it is for, and step-by-step instructions to obtain it. Copy `env.example` to `.env.local` and fill in the values as you go.

---

## Required Keys

These must be set for the core app to work.

### 1. OpenAI API Key (`OPENAI_API_KEY`)

**Used for:** AI dance coaching messages (GPT-4o-mini) and TTS voice fallback.

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Click your profile → **API keys** (or go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys))
4. Click **Create new secret key** → give it a name → copy the key
5. Paste it as `OPENAI_API_KEY=sk-...` in `.env.local`

> **Cost:** Usage-based. GPT-4o-mini is very cheap (~$0.15/1M input tokens). Budget ~$5–20/month for moderate use. Add a spending limit in Settings → Billing → Limits.

---

## Highly Recommended Keys

These unlock significantly better user experience.

### 2. ElevenLabs API Key (`ELEVENLABS_API_KEY`)

**Used for:** Higher-quality TTS coaching voices. Falls back to OpenAI TTS if absent.

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign up
2. Click your profile icon → **Profile + API key**
3. Copy the API key shown under "API Key"
4. Paste as `ELEVENLABS_API_KEY=` in `.env.local`

> **Cost:** Free tier includes 10,000 characters/month. Starter plan ($5/mo) gives 30,000 characters. Recommended for a live product.

---

## Stripe Subscription Keys

Required to charge users and unlock premium features (videos > 30s, landscape YouTube).

### 3. Stripe Secret Key (`STRIPE_SECRET_KEY`)

**Used for:** Server-side API calls — creating checkout sessions, verifying payments.

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign up / log in
2. In the top-left, toggle to **Test mode** while developing
3. Go to **Developers → API keys**
4. Copy the **Secret key** (starts with `sk_test_...`)
5. Paste as `STRIPE_SECRET_KEY=sk_test_...` in `.env.local`
6. When going live, repeat with **Live mode** and `sk_live_...`

### 4. Stripe Publishable Key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)

**Used for:** Client-side Stripe.js (safe to expose in the browser).

- On the same **Developers → API keys** page, copy the **Publishable key** (starts with `pk_test_...`)
- Paste as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` in `.env.local`

### 5. Stripe Price ID (`STRIPE_PREMIUM_PRICE_ID`)

**Used for:** Identifies which subscription plan to charge for.

1. In the Stripe Dashboard, go to **Product catalog → Add product**
2. Name it (e.g., "Must Dance Premium")
3. Set up two prices:
   - Monthly recurring: **$9.99/month**
   - Annual recurring: **$79/year**
4. After saving, click into the Monthly price → copy the **Price ID** (starts with `price_...`)
5. Paste as `STRIPE_PREMIUM_PRICE_ID=price_...` in `.env.local`
6. Repeat for the annual price if you want to offer both (add `STRIPE_PREMIUM_PRICE_ID_ANNUAL=price_...`)

### 6. Stripe Webhook Secret (`STRIPE_WEBHOOK_SECRET`)

**Used for:** Verifying that webhook events come from Stripe, not attackers.

#### Local development (using Stripe CLI):
1. Install the Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Run: `stripe login`
3. Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the **webhook signing secret** printed in the terminal (starts with `whsec_...`)
5. Paste as `STRIPE_WEBHOOK_SECRET=whsec_...` in `.env.local`

#### Production (deployed app):
1. Go to **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. After saving, click **Reveal** under "Signing secret" → copy it
5. Paste as `STRIPE_WEBHOOK_SECRET=whsec_...` in your hosting provider's environment variables

---

## Optional Keys

These enable additional features. The app works without them.

### 7. Vercel Blob Token (`BLOB_READ_WRITE_TOKEN`)

**Used for:** Storing webcam session recordings so users can replay them.

1. Go to [vercel.com](https://vercel.com) and sign in
2. Open your project → **Storage** tab → **Create Database → Blob**
3. Follow the setup wizard — Vercel will inject `BLOB_READ_WRITE_TOKEN` automatically if you use Vercel hosting
4. For local dev, go to **Storage → your Blob store → `.env.local` snippet** and copy the token
5. Paste as `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...` in `.env.local`

> **Cost:** Free tier includes 500 MB storage and 1 GB transfer/month.

### 8. Replicate API Token (`REPLICATE_API_TOKEN`)

**Used for:** AI video generation and SAM2 background segmentation (removes background behind the dancer).

1. Go to [replicate.com](https://replicate.com) and sign in with GitHub
2. Go to [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
3. Click **Create token** → give it a name → copy it
4. Paste as `REPLICATE_API_TOKEN=r8_...` in `.env.local`

> **Cost:** Usage-based, billed per second of compute. Segmentation runs ~$0.01–0.05 per video.

### 9. xAI / Grok API Key (`XAI_API_KEY`)

**Used for:** Groq vision-based scoring (compares webcam frames to reference video frames visually). Falls back to heuristic scoring if absent.

1. Go to [console.x.ai](https://console.x.ai)
2. Sign in and create an API key
3. Paste as `XAI_API_KEY=xai-...` in `.env.local`

> **Cost:** Usage-based. Vision requests are more expensive than text — budget accordingly.

### 10. Bright Data Credentials (`BRIGHTDATA_HOST`, `BRIGHTDATA_USERNAME`, `BRIGHTDATA_PASSWORD`)

**Used for:** Residential proxy support for yt-dlp in restricted environments (e.g., if YouTube blocks your server's IP).

1. Go to [brightdata.com](https://brightdata.com) and sign up
2. Create a **Residential** proxy zone
3. Under your zone settings, find the **Host**, **Username**, and **Password**
4. Paste each into `.env.local`

> **Note:** Only needed if yt-dlp downloads fail with 403/429 errors on your deployment server. Not needed for local development.

---

## System Dependencies (not env vars)

These must be installed on your machine or server — they are command-line tools, not API keys.

### yt-dlp

Downloads videos from YouTube and TikTok.

```bash
# macOS
brew install yt-dlp

# Linux / Ubuntu
pip install yt-dlp
# OR
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod +x /usr/local/bin/yt-dlp

# Windows
winget install yt-dlp
```

Keep it updated regularly — YouTube frequently changes their systems:
```bash
yt-dlp -U
```

### ffmpeg

Used by yt-dlp to mux audio and video streams.

```bash
# macOS
brew install ffmpeg

# Linux / Ubuntu
sudo apt-get install ffmpeg

# Windows
winget install ffmpeg
```

---

## Quick Checklist

| Key | Required | Free Tier | Sign-up Link |
|-----|----------|-----------|--------------|
| `OPENAI_API_KEY` | ✅ Yes | ❌ (pay per use, ~$5 credit on signup) | [platform.openai.com](https://platform.openai.com) |
| `ELEVENLABS_API_KEY` | ⚡ Recommended | ✅ 10K chars/mo | [elevenlabs.io](https://elevenlabs.io) |
| `STRIPE_SECRET_KEY` | 💳 For payments | ✅ Test mode is free | [dashboard.stripe.com](https://dashboard.stripe.com) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 💳 For payments | ✅ | same as above |
| `STRIPE_PREMIUM_PRICE_ID` | 💳 For payments | ✅ | same as above |
| `STRIPE_WEBHOOK_SECRET` | 💳 For payments | ✅ | same as above |
| `BLOB_READ_WRITE_TOKEN` | 🎥 For recordings | ✅ 500 MB/mo | [vercel.com](https://vercel.com) |
| `REPLICATE_API_TOKEN` | 🤖 For AI features | ❌ (pay per use) | [replicate.com](https://replicate.com) |
| `XAI_API_KEY` | 👁 For vision scoring | ❌ (pay per use) | [console.x.ai](https://console.x.ai) |
| `BRIGHTDATA_*` | 🌐 Server proxy only | ❌ | [brightdata.com](https://brightdata.com) |
| `yt-dlp` (CLI) | ✅ Yes | ✅ Free | [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| `ffmpeg` (CLI) | ✅ Yes | ✅ Free | [ffmpeg.org](https://ffmpeg.org) |

---

## Minimum Setup to Run Locally

You only need these three things to get the app running end-to-end:

```bash
# 1. Install system tools
brew install yt-dlp ffmpeg   # macOS

# 2. Set minimum env vars
echo "OPENAI_API_KEY=sk-..." >> .env.local

# 3. Start the dev server
npm run dev
```

Stripe and other integrations can be added when you're ready to monetize.
