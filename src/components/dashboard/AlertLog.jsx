import React from "react";
import { Zap } from "lucide-react";

export default function AlertLog({ log }) {
  if (!log.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={15} className="text-gold" />
        <p className="text-sm font-bold text-ink">Alert log</p>
      </div>
      <div className="space-y-2">
        {log.map((a, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">{a.symbol} · {a.tf} · {a.pattern}</span>
            <span className="text-ink/40">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
