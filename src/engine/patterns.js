// Candlestick reversal pattern detection.
export const PATTERNS = [
  "Bullish Engulfing", "Bearish Engulfing", "Hammer", "Shooting Star", "Doji",
  "Morning Star", "Evening Star", "Tweezer Bottom", "Tweezer Top",
  "Bullish Harami", "Bearish Harami",
];

export function makeCandle(rand, open, driftBias, volatility) {
  const move = (rand() - 0.5 + driftBias * 0.3) * volatility;
  const close = open + move;
  const wickUp = rand() * volatility * 0.6;
  const wickDown = rand() * volatility * 0.6;
  return { open, close, high: Math.max(open, close) + wickUp, low: Math.min(open, close) - wickDown };
}

export function injectPattern(rand, basePrice, volatility, patternName) {
  const c = (o, cl, h, l) => ({ open: o, close: cl, high: h ?? Math.max(o, cl), low: l ?? Math.min(o, cl) });
  const p = basePrice, v = volatility;
  switch (patternName) {
    case "Bullish Engulfing": return [c(p, p - v * 0.8), c(p - v * 0.85, p + v * 0.5)];
    case "Bearish Engulfing": return [c(p, p + v * 0.8), c(p + v * 0.85, p - v * 0.5)];
    case "Hammer": return [c(p, p + v * 0.15, p + v * 0.25, p - v * 1.6)];
    case "Shooting Star": return [c(p, p - v * 0.15, p + v * 1.6, p - v * 0.25)];
    case "Doji": return [c(p, p + v * 0.02, p + v * 0.9, p - v * 0.9)];
    case "Morning Star": return [c(p + v * 0.9, p, p + v, p - v * 0.05), c(p - v * 0.1, p - v * 0.15, p, p - v * 0.3), c(p - v * 0.05, p + v * 0.7, p + v * 0.75, p - v * 0.1)];
    case "Evening Star": return [c(p - v * 0.9, p, p + v * 0.05, p - v), c(p + v * 0.1, p + v * 0.15, p + v * 0.3, p), c(p + v * 0.05, p - v * 0.7, p + v * 0.1, p - v * 0.75)];
    case "Tweezer Bottom": return [c(p, p + v * 0.6, p + v * 0.65, p - v), c(p - v * 0.1, p + v * 0.65, p + v * 0.7, p - v * 0.98)];
    case "Tweezer Top": return [c(p, p - v * 0.6, p + v, p - v * 0.65), c(p + v * 0.1, p - v * 0.65, p + v * 0.98, p - v * 0.7)];
    case "Bullish Harami": return [c(p + v * 0.8, p - v * 0.8), c(p, p + v * 0.15)];
    case "Bearish Harami": return [c(p - v * 0.8, p + v * 0.8), c(p, p - v * 0.15)];
    default: return [c(p, p + (rand() - 0.5) * v)];
  }
}

export function detectPattern(candles) {
  const n = candles.length;
  if (n < 1) return null;
  const last = candles[n - 1];
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low || 1e-9;
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const bullish = last.close > last.open;

  if (n >= 2) {
    const prev = candles[n - 2];
    const prevBody = Math.abs(prev.close - prev.open);
    const prevBull = prev.close > prev.open;
    if (!prevBull && bullish && last.open <= prev.close && last.close >= prev.open && body > prevBody * 0.95)
      return { name: "Bullish Engulfing", direction: "bullish" };
    if (prevBull && !bullish && last.open >= prev.close && last.close <= prev.open && body > prevBody * 0.95)
      return { name: "Bearish Engulfing", direction: "bearish" };
    if (!prevBull && bullish && last.open > prev.close && last.close < prev.open && body < prevBody * 0.6)
      return { name: "Bullish Harami", direction: "bullish" };
    if (prevBull && !bullish && last.open < prev.close && last.close > prev.open && body < prevBody * 0.6)
      return { name: "Bearish Harami", direction: "bearish" };
    if (Math.abs(prev.low - last.low) < range * 0.15 && !prevBull && bullish)
      return { name: "Tweezer Bottom", direction: "bullish" };
    if (Math.abs(prev.high - last.high) < range * 0.15 && prevBull && !bullish)
      return { name: "Tweezer Top", direction: "bearish" };
  }
  if (n >= 3) {
    const [a, b] = [candles[n - 3], candles[n - 2]];
    const aBull = a.close > a.open, aBody = Math.abs(a.close - a.open);
    const bBody = Math.abs(b.close - b.open);
    if (!aBull && bBody < aBody * 0.4 && bullish && last.close > (a.open + a.close) / 2)
      return { name: "Morning Star", direction: "bullish" };
    if (aBull && bBody < aBody * 0.4 && !bullish && last.close < (a.open + a.close) / 2)
      return { name: "Evening Star", direction: "bearish" };
  }
  if (body < range * 0.12) return { name: "Doji", direction: "neutral" };
  if (lowerWick > body * 2 && upperWick < body * 0.5) return { name: "Hammer", direction: "bullish" };
  if (upperWick > body * 2 && lowerWick < body * 0.5) return { name: "Shooting Star", direction: "bearish" };
  return null;
}
