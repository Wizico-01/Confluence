import React, { useState } from "react";
import { ChevronRight, Target } from "lucide-react";
import { CASCADES } from "../../engine/symbols.js";

export default function SetupPanel({ onComplete }) {
  const [style, setStyle] = useState("day");
  const [accountSize, setAccountSize] = useState(1000);
  const [riskMode, setRiskMode] = useState("conservative");
  const [aggressivePct, setAggressivePct] = useState(4);

  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-royal">
          <Target size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-ink font-display">Set up your profile</span>
      </div>
      <p className="text-sm mb-7 text-ink/50">This tunes the cascade, risk sizing, and alerts to how you actually trade.</p>

      <p className="text-xs font-bold uppercase tracking-wide mb-2 text-ink/40">Trading style</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {Object.entries(CASCADES).map(([key, v]) => (
          <button
            key={key} onClick={() => setStyle(key)}
            className={`rounded-xl border py-2.5 text-xs font-bold ${style === key ? "border-royal bg-royal text-white" : "border-line bg-white text-ink"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide mb-2 text-ink/40">Account size (USD)</p>
      <input
        type="number" value={accountSize} min={50} onChange={(e) => setAccountSize(+e.target.value)}
        className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold mb-6 outline-none text-ink"
      />

      <p className="text-xs font-bold uppercase tracking-wide mb-2 text-ink/40">Risk profile</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setRiskMode("conservative")}
          className={`rounded-xl border py-2.5 text-xs font-bold ${riskMode === "conservative" ? "border-royal bg-royal text-white" : "border-line bg-white text-ink"}`}
        >
          Conservative · 2%
        </button>
        <button
          onClick={() => setRiskMode("aggressive")}
          className={`rounded-xl border py-2.5 text-xs font-bold ${riskMode === "aggressive" ? "border-royal bg-royal text-white" : "border-line bg-white text-ink"}`}
        >
          Aggressive · 3–5%
        </button>
      </div>
      {riskMode === "aggressive" && (
        <div className="mb-6 px-1">
          <input type="range" min={3} max={5} step={0.5} value={aggressivePct} onChange={(e) => setAggressivePct(+e.target.value)} className="w-full accent-blue-700" />
          <p className="text-xs font-semibold text-center mt-1 text-royal-dark">{aggressivePct}% risk per trade</p>
        </div>
      )}

      <button
        onClick={() => onComplete({ style, accountSize, riskPercent: riskMode === "conservative" ? 2 : aggressivePct })}
        className="w-full rounded-xl py-3 text-sm font-bold text-white mt-4 flex items-center justify-center gap-1.5 bg-royal"
      >
        Start analysing <ChevronRight size={16} />
      </button>
    </div>
  );
}
