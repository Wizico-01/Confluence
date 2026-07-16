import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const MAP = {
  uptrend: { icon: TrendingUp, bg: "#E6F7EF", fg: "#0E9F6E", label: "Uptrend" },
  downtrend: { icon: TrendingDown, bg: "#FDECEF", fg: "#E11D48", label: "Downtrend" },
  range: { icon: Minus, bg: "#F2F4FC", fg: "#0F1F99", label: "Range" },
};

export default function TrendBadge({ trend }) {
  const m = MAP[trend];
  const Icon = m.icon;
  return (
    <span style={{ background: m.bg, color: m.fg }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold">
      <Icon size={13} strokeWidth={2.5} /> {m.label}
    </span>
  );
}
