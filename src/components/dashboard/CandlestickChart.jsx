import React from "react";

// Renders an actual candlestick chart. If real OHLC candles exist for this
// tier (live data), draws them directly. If only swing points exist (demo
// data), synthesizes a plausible candle sequence between them so it still
// looks like a real chart rather than a simplified zigzag line.
export default function CandlestickChart({ candles, labeled, trend }) {
  const bars = candles?.length ? candles : synthesizeCandles(labeled);
  if (!bars.length) return <div className="h-16" />;

  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;

  const w = 280, h = 64, pad = 4;
  const barW = (w - pad * 2) / bars.length;
  const y = (price) => h - pad - ((price - min) / range) * (h - pad * 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      {bars.map((b, i) => {
        const bullish = b.close >= b.open;
        const color = bullish ? "#0E9F6E" : "#E11D48";
        const cx = pad + i * barW + barW / 2;
        const bodyTop = y(Math.max(b.open, b.close));
        const bodyBottom = y(Math.min(b.open, b.close));
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(b.high)} y2={y(b.low)} stroke={color} strokeWidth="1" />
            <rect
              x={cx - barW * 0.32} y={Math.min(bodyTop, bodyBottom)}
              width={barW * 0.64} height={Math.max(1, Math.abs(bodyBottom - bodyTop))}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

// Builds a rough OHLC sequence between swing points purely for visual
// purposes when no real candles exist yet (demo forex data).
function synthesizeCandles(labeled) {
  if (!labeled?.length) return [];
  const bars = [];
  for (let i = 0; i < labeled.length - 1; i++) {
    const from = labeled[i].price, to = labeled[i + 1].price;
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps, t1 = (s + 1) / steps;
      const open = from + (to - from) * t0;
      const close = from + (to - from) * t1;
      const wiggle = Math.abs(to - from) * 0.15;
      bars.push({
        open, close,
        high: Math.max(open, close) + wiggle * Math.random(),
        low: Math.min(open, close) - wiggle * Math.random(),
      });
    }
  }
  return bars;
}