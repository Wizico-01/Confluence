import React from "react";
import { TrendingDown } from "lucide-react";

// Shows the computed Fibonacci retracement levels for the entry timeframe,
// highlighting 50.0 and 61.8 since those are the only two that count as
// confluence in Kceemu's system — the others are shown for reference only.
export default function FibPanel({ fib, symbol, decimals }) {
  if (!fib?.valid) {
    return (
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingDown size={15} className="text-royal" />
          <p className="text-sm font-bold text-ink">Fibonacci retracement</p>
        </div>
        <p className="text-xs text-ink/40">No valid swing to measure — market is ranging on the entry timeframe.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingDown size={15} className="text-royal" />
          <p className="text-sm font-bold text-ink">Fibonacci retracement</p>
        </div>
        {fib.priceAtKeyRetracement && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-bull/10 text-bull">
            At {fib.atKeyLevel.label}% level
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {fib.levels.map((l) => {
          const isKey = l.label === "50.0" || l.label === "61.8";
          const isActive = fib.atKeyLevel?.label === l.label;
          return (
            <div
              key={l.label}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${
                isActive ? "bg-royal text-white" : isKey ? "bg-mist" : ""
              }`}
            >
              <span className={`text-xs font-bold ${isActive ? "text-white" : isKey ? "text-royal-dark" : "text-ink/40"}`}>
                {l.label}%
              </span>
              <span className={`text-xs font-nums font-semibold ${isActive ? "text-white" : "text-ink/70"}`}>
                {l.price.toFixed(decimals)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-ink/30 mt-2">Only 50.0% and 61.8% count toward confluence scoring.</p>
    </div>
  );
}
