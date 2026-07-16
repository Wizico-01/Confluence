// Fibonacci retracement — computed from the most recent completed swing
// (last swing high to last swing low, or vice versa) on the entry timeframe.
// Per Kceemu's system: only the 50.0% and 61.8% levels count as valid
// retracement confluence — these are the levels price is expected to
// react from before continuing the original trend.

const LEVELS = [
  { pct: 0, label: "0.0" },
  { pct: 0.382, label: "38.2" },
  { pct: 0.5, label: "50.0" },
  { pct: 0.618, label: "61.8" },
  { pct: 1, label: "100.0" },
];

// Valid confluence levels per the trading system — kept separate from the
// full LEVELS list above (which is used just for drawing/reference).
const KEY_RETRACEMENT_LEVELS = [0.5, 0.618];

/**
 * Builds a Fibonacci retracement from the two most recent alternating swing
 * points (a high and a low) on the entry timeframe, then checks whether the
 * live price sits at the 50% or 61.8% retracement of that swing.
 *
 * @param {Array<{type: 'high'|'low', price: number}>} labeled - swing points, oldest first
 * @param {'uptrend'|'downtrend'|'range'} trend
 * @param {number} livePrice
 * @param {number} tolerance - price distance considered "at" a level
 */
export function buildFibonacci(labeled, trend, livePrice, tolerance) {
  if (trend === "range" || labeled.length < 2) return { valid: false };

  const lastHigh = [...labeled].reverse().find((p) => p.type === "high");
  const lastLow = [...labeled].reverse().find((p) => p.type === "low");
  if (!lastHigh || !lastLow) return { valid: false };

  // In an uptrend we measure the retracement down from high to low's origin
  // swing (i.e. pullback against the trend, low -> high, retracing toward low).
  // In a downtrend it's the mirror: high -> low, retracing back up toward high.
  const swingStart = trend === "uptrend" ? lastLow.price : lastHigh.price;
  const swingEnd = trend === "uptrend" ? lastHigh.price : lastLow.price;
  const range = swingEnd - swingStart;

  const levels = LEVELS.map((l) => ({
    ...l,
    price: swingEnd - range * l.pct,
  }));

  const keyLevels = levels.filter((l) => KEY_RETRACEMENT_LEVELS.includes(l.pct));
  const atKeyLevel = keyLevels.find((l) => Math.abs(l.price - livePrice) < tolerance);

  return {
    valid: true,
    swingStart,
    swingEnd,
    levels,
    atKeyLevel: atKeyLevel ?? null,
    priceAtKeyRetracement: !!atKeyLevel,
  };
}
