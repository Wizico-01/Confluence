// Orchestrates a full cascade analysis for a symbol + trading style.

import { mulberry32, hashStr } from "./rng.js";
import { CASCADES, basePriceFor, psychLevelsNear, psychLevelsInDirection, decimalsFor, fmtPrice } from "./symbols.js";
import { generateStructure, labelStructure, deriveTrend, evaluateBOS, detectSwingPoints, labelSwingPointsFromCandles, evaluateBOSFromCandles } from "./structure.js";
import { PATTERNS, makeCandle, injectPattern, detectPattern } from "./patterns.js";
import { buildConfluence } from "./confluence.js";
import { buildFibonacci } from "./fibonacci.js";

/*
 * Turns a confirmed setup into an actual trade plan: entry price, stop
 * loss, take profit (always a psychological level), and whether price is
 * currently sitting in the good entry zone or has already run past it.
 */
function buildTradePlan(entryTier, pattern, fib, keyLevels, livePrice, symbol, base, score) {
  // Direction always follows the entry timeframe's trend — this is a
  // trend-continuation system, not a reversal system. A reversal candle
  // during a pullback confirms getting back IN the trend's direction.
  let direction;
  if (entryTier.trend === "uptrend") direction = "buy";
  else if (entryTier.trend === "downtrend") direction = "sell";
  else return null; // ranging market — no valid trend-following plan

  const confirmed = !!pattern && pattern.direction !== "neutral" &&
    ((direction === "buy" && pattern.direction === "bullish") || (direction === "sell" && pattern.direction === "bearish"));

  const tolerance = base * 0.0012;

  // Entry MUST be an actual psychological level — every keyLevels entry
  // already is one (see psychLevelsNear), so this never uses Fibonacci or
  // any non-round-number price as the entry.
  const merged = keyLevels.find((k) => k.merged);
  const nearest = keyLevels.reduce((c, k) =>
    !c || Math.abs(k.price - livePrice) < Math.abs(c.price - livePrice) ? k : c, null);
  const entryPrice = merged ? merged.price : (nearest ? nearest.price : livePrice);

  // Bonus confluence: does the Fibonacci 50%/61.8% level land on this same
  // psych-level entry? If so, that's extra confirmation worth surfacing.
  const fibTolerance = base * 0.0015;
  const fibAligns = fib?.priceAtKeyRetracement && Math.abs(fib.atKeyLevel.price - entryPrice) < fibTolerance;

  // Stop loss: just beyond the swing point that would invalidate the setup.
  const swingBuffer = base * 0.0015;
  let stopLoss;
  if (direction === "buy") {
    const swingLow = [...entryTier.labeled].reverse().find((p) => p.type === "low");
    stopLoss = (swingLow ? swingLow.price : entryPrice - base * 0.004) - swingBuffer;
  } else {
    const swingHigh = [...entryTier.labeled].reverse().find((p) => p.type === "high");
    stopLoss = (swingHigh ? swingHigh.price : entryPrice + base * 0.004) + swingBuffer;
  }

  // Take profit: nearest psychological level beyond entry, in the trade's
  // direction, giving at least a 1.5:1 reward-to-risk ratio.
  const risk = Math.abs(entryPrice - stopLoss);
  const candidates = psychLevelsInDirection(symbol, entryPrice, direction, 6);
  const takeProfit = candidates.find((lvl) => Math.abs(lvl - entryPrice) >= risk * 1.5) ?? candidates[candidates.length - 1] ?? null;

  // Zone status uses a tight tolerance — "at the zone" must mean genuinely
  // at the level, not merely somewhere in its general vicinity.
  const zoneTolerance = tolerance * 0.5;
  const distancePastEntry = direction === "buy" ? livePrice - entryPrice : entryPrice - livePrice;
  let zoneStatus, zoneMessage;

  if (distancePastEntry > zoneTolerance) {
    zoneStatus = "missed";
    zoneMessage = "Price has already moved past this zone — do not enter. Wait for a fresh pullback.";
  } else if (Math.abs(livePrice - entryPrice) <= zoneTolerance) {
    // Price IS at the psych level — but that alone is never a signal.
    // A signal requires strong confluence (5+) AND a confirmed reversal
    // candle in the trend's direction at this exact level.
    if (score >= 5 && confirmed) {
      zoneStatus = "at_zone";
      zoneMessage = fibAligns
        ? `Price is at the ${fmtPrice(symbol, entryPrice)} psychological level — reinforced by the ${fib.atKeyLevel.label}% Fibonacci level lining up exactly here — with strong confluence, in line with the trend. Valid entry.`
        : `Price is at the ${fmtPrice(symbol, entryPrice)} psychological level with strong confluence, in line with the trend — valid entry.`;
    } else {
      zoneStatus = "insufficient";
      zoneMessage = `Price is at ${fmtPrice(symbol, entryPrice)}, a psychological level, but confluence isn't strong enough yet. Not a valid signal.`;
    }
  } else {
    zoneStatus = "approaching";
    zoneMessage = `Price hasn't reached the ${fmtPrice(symbol, entryPrice)} zone yet, wait for it to arrive.`;
  }

  const reward = takeProfit != null ? Math.abs(takeProfit - entryPrice) : null;
  const riskReward = reward != null && risk > 0 ? +(reward / risk).toFixed(2) : null;

  return { direction, entryPrice, stopLoss, takeProfit, riskReward, zoneStatus, zoneMessage, confirmed, fibAligns };
}

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
  const nearestLevel = keyLevels.reduce((closest, k) =>
    !closest || Math.abs(k.price - livePrice) < Math.abs(closest.price - livePrice) ? k : closest, null);
  const priceNearKeyLevel = !!nearestLevel && Math.abs(nearestLevel.price - livePrice) < tolerance * 1.4;
  const mergedLevel = keyLevels.find((k) => k.merged && Math.abs(k.price - livePrice) < tolerance * 1.6);
  const priceNearMergedLevel = !!mergedLevel;

  const fib = buildFibonacci(entryTier.labeled, entryTier.trend, livePrice, tolerance * 1.4);

  const { checklist, score, strength, alarmActive, total } = buildConfluence({
    tiers, entryTier, pattern, priceNearKeyLevel, priceNearMergedLevel, fib, symbol, nearestLevel, mergedLevel,
  });

 const tradePlan = buildTradePlan(entryTier, pattern, fib, keyLevels, livePrice, symbol, base, score);
  // A real signal requires ALL of: strong confluence (5+), a confirmed
  // reversal candle in the trend's direction, AND price genuinely sitting
  // on the psychological level — never just one or two of these.
  const finalAlarmActive = alarmActive && tradePlan?.zoneStatus === "at_zone";

  return {
    symbol, tiers, livePrice, pattern, keyLevels, fib, checklist, score, strength,
    alarmActive: finalAlarmActive, total, tradePlan,
    entryTierName: entryTier.name, decimals: decimalsFor(symbol),
  };
}

export async function buildLiveAnalysis(symbol, style, getTierCandles, visionByTier = {}) {
  const cascade = CASCADES[style];
  const base = basePriceFor(symbol);
  const tolerance = base * 0.0012;

  // Fetch all tiers in parallel
  const candleResults = await Promise.all(cascade.tiers.map((t) => getTierCandles(t)));

  const tiers = cascade.tiers.map((tierName, idx) => {
    const role = cascade.roles[idx];
    const candles = candleResults[idx];

    if (candles && candles.length >= 12) {
      const points = detectSwingPoints(candles, 2);
      const labeled = labelSwingPointsFromCandles(points);
      const trend = deriveTrend(labeled);
      const currentPrice = candles[candles.length - 1].close;
      const bos = evaluateBOSFromCandles(labeled, trend, candles, tolerance);
      return { name: tierName, role, trend, labeled, currentPrice, bos, source: "live", candles };
    } else if (visionByTier[tierName]) {
      const v = visionByTier[tierName];
      return {
        name: tierName, role, trend: v.trend ?? "range",
        labeled: [], currentPrice: null, bos: { occurred: false },
        source: "photo", visionNotes: v,
      };
    } else {
      return { name: tierName, role, trend: "range", labeled: [], currentPrice: null, bos: { occurred: false }, source: "missing" };
    }
  });

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
  const nearestLevel = keyLevels.reduce((closest, k) =>
    !closest || Math.abs(k.price - livePrice) < Math.abs(closest.price - livePrice) ? k : closest, null);
  const priceNearKeyLevel = !!nearestLevel && Math.abs(nearestLevel.price - livePrice) < tolerance * 1.4;
  const mergedLevel = keyLevels.find((k) => k.merged && Math.abs(k.price - livePrice) < tolerance * 1.6);
  const priceNearMergedLevel = !!mergedLevel;

  const fib = entryTier.source === "live"
    ? buildFibonacci(entryTier.labeled, entryTier.trend, livePrice, tolerance * 1.4)
    : { valid: false };

  const { checklist, score, strength, alarmActive, total } = buildConfluence({
    tiers, entryTier, pattern, priceNearKeyLevel, priceNearMergedLevel, fib, symbol, nearestLevel, mergedLevel,
  });

  const tradePlan = buildTradePlan(entryTier, pattern, fib, keyLevels, livePrice, symbol, base);
  const finalAlarmActive = alarmActive && tradePlan?.zoneStatus === "at_zone";

  return {
    symbol, tiers, livePrice, pattern, keyLevels, fib, checklist, score, strength,
    alarmActive: finalAlarmActive, total, tradePlan,
    entryTierName: entryTier.name, decimals: decimalsFor(symbol),
  };
}