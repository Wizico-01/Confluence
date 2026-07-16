// Market structure: swing point generation/labelling, trend derivation,
// and break-of-structure + retest logic.
//
// generateStructure() currently synthesises a plausible swing sequence for
// demo purposes. Once real OHLC candles are wired in via dataProvider.js,
// replace its internals with real fractal/swing-point detection over the
// candle array (see the comment at the bottom of this file for the shape
// that function should take).

export function generateStructure(regime, basePrice, rand, legs = 6) {
  const step = basePrice * 0.006;
  const noise = () => (rand() - 0.5) * step * 0.5;
  const points = [];
  let low = basePrice - step * 0.8;
  let high = basePrice + step * 0.8;

  points.push({ type: "low", price: +(low + noise()).toFixed(6) });
  for (let i = 0; i < legs; i++) {
    if (regime === "uptrend") {
      high += step * (0.6 + rand() * 0.9);
      points.push({ type: "high", price: +(high + noise()).toFixed(6) });
      low += step * (0.25 + rand() * 0.55);
      points.push({ type: "low", price: +(low + noise()).toFixed(6) });
    } else if (regime === "downtrend") {
      high -= step * (0.25 + rand() * 0.55);
      points.push({ type: "high", price: +(high + noise()).toFixed(6) });
      low -= step * (0.6 + rand() * 0.9);
      points.push({ type: "low", price: +(low + noise()).toFixed(6) });
    } else {
      points.push({ type: "high", price: +(high + noise()).toFixed(6) });
      points.push({ type: "low", price: +(low + noise()).toFixed(6) });
    }
  }
  return points;
}

export function labelStructure(points, regime) {
  let lastHigh = null, lastLow = null;
  return points.map((p) => {
    let label;
    if (regime === "range") {
      label = p.type === "high" ? "H" : "L";
    } else if (p.type === "high") {
      label = lastHigh === null ? "H" : p.price > lastHigh ? "HH" : "LH";
      lastHigh = p.price;
    } else {
      label = lastLow === null ? "L" : p.price > lastLow ? "HL" : "LL";
      lastLow = p.price;
    }
    return { ...p, label };
  });
}

export function deriveTrend(labeled) {
  const highs = labeled.filter((p) => p.type === "high").slice(-2).map((p) => p.label);
  const lows = labeled.filter((p) => p.type === "low").slice(-2).map((p) => p.label);
  const lowsUp = lows.every((l) => l === "HL");
  const lowsDown = lows.every((l) => l === "LL" || l === "L");
  if (highs.includes("HH") && lowsUp) return "uptrend";
  if (highs.includes("LH") && lowsDown) return "downtrend";
  return "range";
}

// A break of structure must be retested before it counts toward confluence.
export function evaluateBOS(labeled, trend, rand) {
  if (trend === "range") return { occurred: false };
  const lastOpposingLevel =
    trend === "uptrend"
      ? [...labeled].reverse().find((p) => p.type === "low")
      : [...labeled].reverse().find((p) => p.type === "high");
  if (!lastOpposingLevel) return { occurred: false };

  const occurred = rand() > 0.68;
  if (!occurred) return { occurred: false, level: lastOpposingLevel.price };
  const retestConfirmed = rand() > 0.45;
  const direction = trend === "uptrend" ? "bearish" : "bullish";
  return { occurred: true, direction, level: lastOpposingLevel.price, retestConfirmed };
}

/*
 * Real swing-point detection, used once live candles are available
 * (Deriv candles for synthetic indices, or Twelve Data candles for forex
 * once wired in). A candle at index i is a swing high if its high is the
 * highest within `fractalWidth` candles on each side, and a swing low if
 * its low is the lowest within `fractalWidth` candles on each side.
 */
export function detectSwingPoints(candles, fractalWidth = 2) {
  const points = [];
  for (let i = fractalWidth; i < candles.length - fractalWidth; i++) {
    const window = candles.slice(i - fractalWidth, i + fractalWidth + 1);
    const c = candles[i];
    const isHigh = window.every((w) => w.high <= c.high);
    const isLow = window.every((w) => w.low >= c.low);
    if (isHigh) points.push({ type: "high", price: c.high, index: i });
    else if (isLow) points.push({ type: "low", price: c.low, index: i });
  }
  // Collapse consecutive same-type points (keep the most extreme one) so the
  // sequence alternates high/low the way labelStructure() expects.
  const collapsed = [];
  for (const p of points) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.type === p.type) {
      if ((p.type === "high" && p.price > last.price) || (p.type === "low" && p.price < last.price)) {
        collapsed[collapsed.length - 1] = p;
      }
    } else {
      collapsed.push(p);
    }
  }
  return collapsed;
}

/*
 * Deriv's candle API tops out at 1-day granularity — there's no native
 * weekly/monthly candle. For the Monthly/Weekly cascade tiers, fetch daily
 * candles and group them into `groupSize`-day buckets here instead.
 */
export function aggregateCandles(dailyCandles, groupSize) {
  const groups = [];
  for (let i = 0; i < dailyCandles.length; i += groupSize) {
    const chunk = dailyCandles.slice(i, i + groupSize);
    if (!chunk.length) continue;
    groups.push({
      open: chunk[0].open,
      close: chunk[chunk.length - 1].close,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
    });
  }
  return groups;
}

/*
 * Generic swing labeling for REAL candle data, where the regime isn't known
 * ahead of time (unlike the demo generator above, which picks a regime
 * first and shapes points to match it). Labels purely by comparing each
 * point to the previous point of the same type — deriveTrend() then reads
 * HH/HL vs LH/LL from these labels to decide the regime itself.
 */
export function labelSwingPointsFromCandles(points) {
  let lastHigh = null, lastLow = null;
  return points.map((p) => {
    let label;
    if (p.type === "high") {
      label = lastHigh === null ? "H" : p.price > lastHigh ? "HH" : "LH";
      lastHigh = p.price;
    } else {
      label = lastLow === null ? "L" : p.price > lastLow ? "HL" : "LL";
      lastLow = p.price;
    }
    return { ...p, label };
  });
}

/*
 * Real break-of-structure + retest detection from actual candles — used
 * for live data (Deriv synthetic indices, or forex once Twelve Data is
 * wired in), replacing the probabilistic evaluateBOS() above which only
 * exists for the seeded demo data path.
 */
export function evaluateBOSFromCandles(labeled, trend, candles, tolerance) {
  if (trend === "range") return { occurred: false };
  const lastOpposing =
    trend === "uptrend"
      ? [...labeled].reverse().find((p) => p.type === "low")
      : [...labeled].reverse().find((p) => p.type === "high");
  if (!lastOpposing) return { occurred: false };

  const startIdx = (lastOpposing.index ?? 0) + 1;
  const after = candles.slice(startIdx);

  let breakIdx = -1;
  for (let i = 0; i < after.length; i++) {
    const c = after[i];
    if (trend === "uptrend" && c.close < lastOpposing.price) { breakIdx = i; break; }
    if (trend === "downtrend" && c.close > lastOpposing.price) { breakIdx = i; break; }
  }
  if (breakIdx === -1) return { occurred: false, level: lastOpposing.price };

  const afterBreak = after.slice(breakIdx + 1);
  const retestConfirmed = afterBreak.some(
    (c) => Math.abs((trend === "uptrend" ? c.high : c.low) - lastOpposing.price) < tolerance
  );
  const direction = trend === "uptrend" ? "bearish" : "bullish";
  return { occurred: true, direction, level: lastOpposing.price, retestConfirmed };
}
