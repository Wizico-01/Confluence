// Confluence scoring: turns the cascade + pattern + level data into the
// 8-point checklist and an overall strength label.
export function buildConfluence({ tiers, entryTier, pattern, priceNearKeyLevel, priceNearMergedLevel, fib }) {
  const biasTrend = tiers[0].trend;
  const directionTrend = tiers[1].trend;
  const trendTierTrend = tiers[2].trend;

  const cascadeAligned = biasTrend !== "range" && biasTrend === directionTrend;
  const trendConfirms = trendTierTrend === biasTrend;
  const structureClean = entryTier.trend !== "range";
  const bosOk = !entryTier.bos.occurred || entryTier.bos.retestConfirmed;
  const patternValid = !!pattern && pattern.direction !== "neutral";
  const patternAgreesWithBias =
    patternValid &&
    ((biasTrend === "downtrend" && pattern.direction === "bullish") ||
      (biasTrend === "uptrend" && pattern.direction === "bearish") ||
      biasTrend === "range");

  const checklist = [
    { key: "bias", label: `${tiers[0].name} bias & ${tiers[1].name} direction agree`, pass: cascadeAligned },
    { key: "trend", label: `${tiers[2].name} trend confirms higher-timeframe bias`, pass: trendConfirms },
    { key: "structure", label: "Market structure is clean (not choppy/range)", pass: structureClean },
    { key: "bos", label: entryTier.bos.occurred ? "Break of structure retested before acting" : "No conflicting break of structure", pass: bosOk },
    { key: "level", label: "Price sitting at a key support/resistance level", pass: priceNearKeyLevel },
    { key: "merged", label: "That level is a psych level + structure overlap", pass: priceNearMergedLevel },
    { key: "pattern", label: pattern ? `Reversal candlestick confirmed (${pattern.name})` : "Reversal candlestick confirmed", pass: patternValid && patternAgreesWithBias },
    {
      key: "fib",
      label: fib?.valid
        ? `Price at ${fib.atKeyLevel ? fib.atKeyLevel.label : "50.0/61.8"}% Fibonacci retracement`
        : "Price at 50.0% or 61.8% Fibonacci retracement",
      pass: !!fib?.priceAtKeyRetracement,
    },
  ];

  // Scale is now out of 8 (7 original factors + Fibonacci retracement).
  // Kceemu's "4 minimum" rule is preserved as the floor for a valid alarm;
  // banding above that is widened slightly to account for the extra point.
  const score = checklist.filter((c) => c.pass).length;
  const strength = score < 4 ? "Weak" : score === 4 ? "Good" : score <= 6 ? "Strong" : "Very Strong";
  const alarmActive = score >= 4 && patternValid && patternAgreesWithBias;

  return { checklist, score, strength, alarmActive, total: checklist.length };
}
