# Confluence

Multi-timeframe, top-down forex trade analysis — subscription SaaS. React + Vite frontend, Supabase (auth, database, edge functions) backend, Paystack for monthly billing.

## Project structure

```
src/
  pages/          Home, HowItWorks, Pricing, Login, Signup, Dashboard, Account
  components/     Navbar, Footer, Logo, PricingCard, ProtectedRoute
  components/dashboard/   SetupPanel, TierCard, Sparkline, ChecklistPanel, RiskPanel, AlertLog
  engine/         The actual trading logic — structure detection, candlestick
                   patterns, confluence scoring, risk/lot sizing, data provider
  context/        AuthContext (Supabase session + subscription state)
  lib/            supabaseClient, paystack checkout helper, edge function wrapper
supabase/
  migrations/     Database schema (profiles, payments) with row-level security,
                   plus a private storage bucket for user-uploaded chart images
  functions/      paystack-verify, paystack-webhook, market-data,
                   analyze-chart-image (all Deno edge functions)
```

## Fibonacci retracement

`src/engine/fibonacci.js` computes a retracement from the most recent swing high/low on the
entry timeframe. Only the **50.0%** and **61.8%** levels count toward the confluence score
(per Kceemu's system) — other standard levels (38.2%, 100%) are computed and shown in the
`FibPanel` for reference only, but don't add to the score. This is now an 8th confluence
factor, so the score/strength scale is out of 8, not 7.

## Chart screenshot upload

Traders can optionally upload a landscape chart screenshot for each timeframe their cascade
requires. Flow:

1. Image uploads to a **private** Supabase Storage bucket (`chart-uploads`), scoped to the
   user's own folder via RLS policies in the migration.
2. A short-lived signed URL is generated and passed to the `analyze-chart-image` edge function.
3. That function sends the image to a vision-capable model (Claude, shown in the code) with a
   strict prompt asking for trend, visible structure, any obvious reversal candlestick, and a
   one-line summary — returned as JSON and shown under the relevant timeframe in the UI.

**This is a second opinion, not a replacement for the live cascade.** Reading structure from a
static screenshot is inherently fuzzier than computing it from real OHLC data — the UI copy and
this code are written to keep that distinction clear rather than implying the two are equivalent.

## Current status: demo data, real architecture

The engine (`src/engine/`) is fully functional — structure detection, break-of-structure +
retest logic, all 11 candlestick patterns, confluence scoring, and risk sizing are real code,
not placeholders. **The price feed itself is currently seeded demo data** (see the comment at
the top of `src/engine/dataProvider.js`), so the whole product can be built, tested, and
demoed before your Twelve Data (or other provider) key is wired in.

To go live with real prices: deploy the `market-data` edge function, set your `TWELVE_DATA_API_KEY`
secret, and swap `buildAnalysis`'s synthetic tier generation for calls to `fetchCandles()` from
`src/lib/api.js`. The rest of the pipeline doesn't change.

## Setup

### 1. Supabase

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Deploy edge functions
supabase functions deploy paystack-verify
supabase functions deploy paystack-webhook --no-verify-jwt
supabase functions deploy market-data
supabase functions deploy analyze-chart-image

# Set secrets (server-side only — never exposed to the browser)
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
supabase secrets set TWELVE_DATA_API_KEY=your-twelve-data-key
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
supabase secrets set DERIV_APP_ID=your-deriv-app-id
```

## Synthetic indices (Volatility 75/100, Boom/Crash, etc.)

These are Deriv's own algorithmically-generated instruments — they don't exist on Twelve Data
or any standard forex/stock provider, so they're handled through a separate, real pathway:

1. **Primary: live data from Deriv's own API.** `supabase/functions/deriv-data` opens a
   WebSocket to Deriv's free public API and pulls real OHLC candles per timeframe. On top of
   that, `src/engine/structure.js` now has genuine swing-point detection
   (`detectSwingPoints`/fractal method) and real break-of-structure + retest logic
   (`evaluateBOSFromCandles`) — not the seeded demo generator used for forex. Deriv only
   supports candle granularities up to 1 day, so Monthly/Weekly tiers are built by fetching
   daily candles and aggregating them (`aggregateCandles`).
2. **Fallback: the chart photo upload.** If a live fetch fails for a given tier (rate limit,
   symbol temporarily unavailable, etc.), that tier's trend comes from the trader's uploaded
   screenshot instead, via `analyze-chart-image`. Tiers are tagged `source: 'live' | 'photo' |
   'missing'` and the UI (`TierCard`) visibly marks which is which — a photo-based tier is never
   silently presented as equivalent to live data, since a static image can't give precise swing
   prices or genuine BOS/retest detection the way real candles can.

Register your own Deriv `app_id` at https://api.deriv.com/ before going live — the public demo
ID (`1089`) works for development but isn't meant for production traffic.

**Forex still runs on demo data** (see the note in `src/engine/dataProvider.js`) until Twelve
Data is wired in the same way — `buildLiveAnalysis` and the real structure-detection functions
above were written to work for either data source, so forex can reuse the same pathway once its
candles are flowing.

Point your Paystack dashboard webhook URL at the deployed `paystack-webhook` function URL.

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (from your Supabase project settings),
and `VITE_PAYSTACK_PUBLIC_KEY` (safe to expose — it only opens the checkout popup).

### 3. Install & run

```bash
npm install
npm run dev
```

### 4. Before going live

- [ ] Replace the placeholder logo in `src/components/Logo.jsx` with your actual brand mark
- [ ] Create real Plans in your Paystack dashboard and update the `planCode` / `priceNaira`
      values in `src/pages/Pricing.jsx`
- [ ] Wire `dataProvider.js` to real candles (see comment in that file)
- [ ] Review `supabase/migrations/0001_init.sql` RLS policies before storing real payment data
- [ ] Switch `PAYSTACK_SECRET_KEY` / plan codes from test to live mode

## Notes on architecture decisions

- **Why edge functions, not client-only:** Paystack verification and your market-data API key
  both require a secret that can never sit in browser code. Edge functions keep both server-side
  while staying inside your existing Supabase project — no separate server to run.
- **Why "logged in" and "subscribed" are checked separately:** `ProtectedRoute` sends a logged-in-but-unpaid
  user to `/pricing`, not `/login` — they're already authenticated, they just need to pay.
