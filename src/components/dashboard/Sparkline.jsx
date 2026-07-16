import React from "react";
import { C } from "../../theme.js";

export default function Sparkline({ points, trend }) {
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const w = 100, h = 34, pad = 3;
  const norm = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const step = (w - pad * 2) / (points.length - 1 || 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(pad + i * step).toFixed(1)},${norm(p.price).toFixed(1)}`).join(" ");
  const stroke = trend === "uptrend" ? C.bull : trend === "downtrend" ? C.bear : C.royal;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={pad + i * step} cy={norm(p.price)} r={i === points.length - 1 ? 2.4 : 1.4}
          fill={i === points.length - 1 ? stroke : "#B9C2EE"} />
      ))}
    </svg>
  );
}
