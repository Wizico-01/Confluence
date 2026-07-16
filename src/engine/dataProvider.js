// Orchestrates a full cascade analysis for a symbol + trading style.
//
// IMPORTANT: this currently generates seeded DEMO data so the whole engine
// can be built and tested end-to-end without live market data wired up yet.
// To go live: replace the body of buildDemoAnalysis's tier-generation loop
// with a call to fetchCandles({ symbol, interval }) from ../lib/api.js for
// each tier's timeframe, run detectSwingPoints() (see structure.js) on the
// real candles, and pass the result into labelStructure/deriveTrend/evaluateBOS
// exactly as this file already does. The rest of the pipeline (patterns,
// confluence, risk) does not need to change.

import { mulberry32, hashStr } from "./rng.js";
import { CASCADES, basePriceFor, psychLevelsNear, decimalsFor } from "./symbols.js";
import { generateStructure, labelStructure, deriveTrend, evaluateBOS, detectSwingPoints, labelSwingPointsFromCandles, evaluateBOSFromCandles } from "./structure.js";
import { PATTERNS, makeCandle, injectPattern, detectPattern } from "./patterns.js";
import { buildConfluence } from "./confluence.js";
import { buildFibonacci } from "./fibonacci.js";

export function buildAnalysis(symbol, style, refreshTick) {
  const seed = hashStr(symbol + style + refreshTick);
  const rand = mulberry32(seed);
  const base = basePriceFor(symbol);
  const cascade = CASCADES[style];

  const regimes = ["uptrend", "downtrend", "range"];
  let parentRegime = regimes[Math.floor(rand() * 3)];

  const tiers = cascade.tiers.map((tierName, idx) => {
    let regime = parentRegime;
    if (idx > 0 && rand() < 0.28) regime = regimes[Math.floor(rand() * 3)];
    parentRegime = regime;
    const priceForTier = base * (1 + (rand() - 0.5) * 0.01 * (idx + 1));
    const raw = generateStructure(regime, priceForTier, rand);
    const labeled = labelStructure(raw, regime);
    const trend = deriveTrend(labeled);
    const currentPrice = labeled[labeled.length - 1].price + (rand() - 0.5) * base * 0.0015;
    const bos = evaluateBOS(labeled, trend, rand);
    return { name: tierName, role: cascade.roles[idx], regime, labeled, trend, currentPrice, bos };
  });

  const entryTier = tiers[tiers.length - 1];
  const livePrice = entryTier.currentPrice;

  const wantPattern = rand() < 0.6;
  const dirGuess =
    entryTier.trend === "downtrend" ? "bullish" : entryTier.trend === "uptrend" ? "bearish" : rand() < 0.5 ? "bullish" : "bearish";
  let candles;
  if (wantPattern) {
    const pool = PATTERNS.filter((p) => (dirGuess === "bullish" ? /Bullish|Hammer|Morning/.test(p) : /Bearish|Shooting|Evening/.test(p)));
    const chosen = pool[Math.floor(rand() * pool.length)];
    candles = injectPattern(rand, livePrice, base * 0.0018, chosen);
  } else {
    candles = Array.from({ length: 3 }, () => makeCandle(rand, livePrice + (rand() - 0.5) * base * 0.001, 0, base * 0.0015));
  }
  const pattern = detectPattern(candles);

  const psych = psychLevelsNear(symbol, livePrice);
  const swingLevels = entryTier.labeled.map((p) => p.price);
  const tolerance = base * 0.0012;
  const keyLevels = psych.map((pl) => {
    const match = swingLevels.find((sl) => Math.abs(sl - pl) < tolerance);
    return { price: pl, merged: !!match };
  });
  const priceNearKeyLevel = keyLevels.some((k) => Math.abs(k.price - livePrice) < tolerance * 1.4);
  const priceNearMergedLevel = keyLevels.some((k) => k.merged && Math.abs(k.price - livePrice) < tolerance * 1.6);

  const fib = buildFibonacci(entryTier.labeled, entryTier.trend, livePrice, tolerance * 1.4);

  const { checklist, score, strength, alarmActive, total } = buildConfluence({
    tiers, entryTier, pattern, priceNearKeyLevel, priceNearMergedLevel, fib,
  });

  return {
    symbol, tiers, livePrice, pattern, keyLevels, fib, checklist, score, strength, alarmActive, total,
    entryTierName: entryTier.name, decimals: decimalsFor(symbol),
  };
}

/*
 * Builds a full cascade analysis from REAL candles — the pathway used for
 * Deriv synthetic indices (Volatility 75/100, Boom/Crash, etc.), and ready
 * to reuse for forex once Twelve Data is wired in. Unlike buildAnalysis()
 * above (seeded demo data), every tier here is either:
 *   - "live": built from actual OHLC candles via detectSwingPoints(), or
 *   - "photo": a fallback built from a user-uploaded chart screenshot's AI
 *     vision read, used only when live candles for that tier's timeframe
 *     failed to fetch. This is clearly weaker than live data — no precise
 *     swing prices, no BOS/retest detection, no Fibonacci for that tier —
 *     so tiers are tagged with `source` and the UI should visually
 *     distinguish "photo" tiers rather than presenting them as equivalent.
 *
 * @param {string} symbol
 * @param {string} style - 'swing' | 'day' | 'scalp'
 * @param {(tierName: string) => Promise<Array|null>} getTierCandles -
 *   returns candles for a tier's timeframe, or null if the live fetch failed
 * @param {Record<string, object>} visionByTier - tierName -> parsed result
 *   from the analyze-chart-image edge function, used as fallback
 */
export async function buildLiveAnalysis(symbol, style, getTierCandles, visionByTier = {}) {
  const cascade = CASCADES[style];
  const base = basePriceFor(symbol);
  const tolerance = base * 0.0012;

  const tiers = [];
  for (let idx = 0; idx < cascade.tiers.length; idx++) {
    const tierName = cascade.tiers[idx];
    const role = cascade.roles[idx];
    const candles = await getTierCandles(tierName);

    if (candles && candles.length >= 12) {
      const points = detectSwingPoints(candles, 2);
      const labeled = labelSwingPointsFromCandles(points);
      const trend = deriveTrend(labeled);
      const currentPrice = candles[candles.length - 1].close;
      const bos = evaluateBOSFromCandles(labeled, trend, candles, tolerance);
      tiers.push({ name: tierName, role, trend, labeled, currentPrice, bos, source: "live", candles });
    } else if (visionByTier[tierName]) {
      const v = visionByTier[tierName];
      // No precise swing prices from a photo read — just enough shape for
      // the tier card to render a trend badge and a note, not a sparkline.
      tiers.push({
        name: tierName, role, trend: v.trend ?? "range",
        labeled: [], currentPrice: null, bos: { occurred: false },
        source: "photo", visionNotes: v,
      });
    } else {
      tiers.push({ name: tierName, role, trend: "range", labeled: [], currentPrice: null, bos: { occurred: false }, source: "missing" });
    }
  }

  const entryTier = tiers[tiers.length - 1];
  const livePrice = entryTier.currentPrice ?? base;

  let pattern = null;
  if (entryTier.source === "live") {
    pattern = detectPattern(entryTier.candles.slice(-3));
  } else if (entryTier.source === "photo" && entryTier.visionNotes?.visible_pattern) {
    const name = entryTier.visionNotes.visible_pattern;
    const direction = /Bullish|Hammer|Morning/.test(name) ? "bullish" : /Bearish|Shooting|Evening/.test(name) ? "bearish" : "neutral";
    pattern = { name, direction };
  }

  const psych = psychLevelsNear(symbol, livePrice);
  const swingLevels = entryTier.labeled.map((p) => p.price);
  const keyLevels = psych.map((pl) => {
    const match = swingLevels.find((sl) => Math.abs(sl - pl) < tolerance);
    return { price: pl, merged: !!match };
  });
  const priceNearKeyLevel = keyLevels.some((k) => Math.abs(k.price - livePrice) < tolerance * 1.4);
  const priceNearMergedLevel = keyLevels.some((k) => k.merged && Math.abs(k.price - livePrice) < tolerance * 1.6);

  const fib = entryTier.source === "live"
    ? buildFibonacci(entryTier.labeled, entryTier.trend, livePrice, tolerance * 1.4)
    : { valid: false };

  const { checklist, score, strength, alarmActive, total } = buildConfluence({
    tiers, entryTier, pattern, priceNearKeyLevel, priceNearMergedLevel, fib,
  });

  return {
    symbol, tiers, livePrice, pattern, keyLevels, fib, checklist, score, strength, alarmActive, total,
    entryTierName: entryTier.name, decimals: decimalsFor(symbol),
  };
}
