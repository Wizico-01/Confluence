export const FOREX_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD",
  "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD",
  "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
  "AUDJPY", "AUDCHF", "AUDCAD", "AUDNZD",
  "NZDJPY", "NZDCHF", "NZDCAD",
  "CADJPY", "CADCHF", "CHFJPY",
  "XAUUSD", "XAGUSD",
];

export const SYMBOLS = FOREX_SYMBOLS;

export const CASCADES = {
  swing: { label: "Swing Trader", tiers: ["Monthly", "Weekly", "Daily", "4H"], roles: ["Bias", "Direction", "Trend", "Entry"] },
  day: { label: "Day Trader", tiers: ["Daily", "4H", "1H", "15M"], roles: ["Bias", "Direction", "Trend", "Entry"] },
  scalp: { label: "Scalper", tiers: ["1H", "30M", "15M", "1M/5M"], roles: ["Bias", "Direction", "Trend", "Entry"] },
};

export function isSynthetic(symbol) {
  return symbol?.startsWith("Vol") || symbol?.startsWith("Boom") || symbol?.startsWith("Crash") || false;
}

export function basePriceFor(symbol) {
  const known = { EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 156.2, XAUUSD: 2410, XAGUSD: 29, GBPJPY: 197.4, AUDUSD: 0.652 };
  return known[symbol] ?? 1.1;
}

export function decimalsFor(symbol) {
  return symbol.includes("JPY") ? 3 : symbol === "XAUUSD" || symbol === "XAGUSD" ? 2 : 5;
}

export function fmtPrice(symbol, val) {
  if (val == null || isNaN(val)) return "-";
  return val.toFixed(decimalsFor(symbol));
}

// Psych levels ahead of price in a given trade direction — used for
// take-profit targets, since TP should always land on a round number.
export function psychLevelsInDirection(symbol, price, direction, count = 5) {
  const grid = symbol === "XAUUSD" ? 10 : symbol === "XAGUSD" ? 0.5 : symbol.includes("JPY") ? 0.5 : 0.005;
  const base = direction === "buy" ? Math.ceil(price / grid) * grid : Math.floor(price / grid) * grid;
  const levels = [];
  for (let i = 0; i <= count; i++) {
    const lvl = direction === "buy" ? base + i * grid : base - i * grid;
    levels.push(+lvl.toFixed(decimalsFor(symbol)));
  }
  return direction === "buy" ? levels.filter((l) => l > price) : levels.filter((l) => l < price);
}

export function psychLevelsNear(symbol, price) {
  const grid = isSynthetic(symbol) ? price * 0.002 : symbol === "XAUUSD" ? 10 : symbol.includes("JPY") ? 0.5 : 0.005;
  const levels = [];
  const base = Math.floor(price / grid) * grid;
  for (let i = -2; i <= 2; i++) levels.push(+(base + i * grid).toFixed(decimalsFor(symbol)));
  return levels;
}