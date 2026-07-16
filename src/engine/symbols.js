export const FOREX_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "GBPJPY", "AUDUSD"];

// Deriv's synthetic indices — algorithmically generated, not real forex,
// so they're never available from Twelve Data or any standard market data
// provider. Live data for these comes from Deriv's own public API instead
// (see supabase/functions/deriv-data).
export const SYNTHETIC_SYMBOLS = [
  "VOL75", "VOL100", "VOL50", "VOL25", "BOOM500", "BOOM1000", "CRASH500", "CRASH1000",
];

// Deriv's underlying symbol codes, used when calling their API.
export const DERIV_SYMBOL_CODES = {
  VOL75: "R_75", VOL100: "R_100", VOL50: "R_50", VOL25: "R_25",
  BOOM500: "BOOM500", BOOM1000: "BOOM1000", CRASH500: "CRASH500", CRASH1000: "CRASH1000",
};

export const SYMBOLS = [...FOREX_SYMBOLS, ...SYNTHETIC_SYMBOLS];

export function isSynthetic(symbol) {
  return SYNTHETIC_SYMBOLS.includes(symbol);
}

export const CASCADES = {
  swing: { label: "Swing Trader", tiers: ["Monthly", "Weekly", "Daily", "4H"], roles: ["Bias", "Direction", "Trend", "Entry"] },
  day: { label: "Day Trader", tiers: ["Daily", "4H", "1H", "15M"], roles: ["Bias", "Direction", "Trend", "Entry"] },
  scalp: { label: "Scalper", tiers: ["1H", "30M", "15M", "1M/5M"], roles: ["Bias", "Direction", "Trend", "Entry"] },
};

// Deriv candle granularity is in seconds and tops out at 1 day (86400) —
// there's no native weekly/monthly candle. For those two tiers we fetch
// daily candles and aggregate them client-side (see structure.js
// aggregateCandles) rather than requesting a granularity Deriv doesn't have.
export const TIER_GRANULARITY_SECONDS = {
  Monthly: { base: "Daily", aggregate: 30 },
  Weekly: { base: "Daily", aggregate: 7 },
  Daily: { seconds: 86400 },
  "4H": { seconds: 14400 },
  "1H": { seconds: 3600 },
  "30M": { seconds: 1800 },
  "15M": { seconds: 900 },
  "1M/5M": { seconds: 300 },
};

export function basePriceFor(symbol) {
  const synthetic = { VOL75: 250000, VOL100: 950000, VOL50: 180000, VOL25: 120000, BOOM500: 6800, BOOM1000: 9300, CRASH500: 6200, CRASH1000: 8700 };
  const forex = { EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 156.2, XAUUSD: 2410, GBPJPY: 197.4, AUDUSD: 0.652 };
  return synthetic[symbol] ?? forex[symbol] ?? 1.1;
}
export function decimalsFor(symbol) {
  if (isSynthetic(symbol)) return 2;
  return symbol.includes("JPY") ? 3 : symbol === "XAUUSD" ? 2 : 5;
}
export function fmtPrice(symbol, val) {
  return val.toFixed(decimalsFor(symbol));
}
export function psychLevelsNear(symbol, price) {
  const grid = isSynthetic(symbol) ? price * 0.002 : symbol === "XAUUSD" ? 10 : symbol.includes("JPY") ? 0.5 : 0.005;
  const levels = [];
  const base = Math.floor(price / grid) * grid;
  for (let i = -2; i <= 2; i++) levels.push(+(base + i * grid).toFixed(decimalsFor(symbol)));
  return levels;
}
