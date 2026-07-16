import React from "react";
import { Shield } from "lucide-react";
import { calcLotSize } from "../../engine/riskCalc.js";

export default function RiskPanel({ accountSize, riskPercent, stopLossPips, setStopLossPips, symbol }) {
  const lot = calcLotSize(accountSize, riskPercent, stopLossPips, symbol);
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Shield size={15} className="text-royal" />
        <p className="text-sm font-bold text-ink">Risk & position size</p>
      </div>
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-ink/50">Account size</span>
        <span className="font-bold font-nums text-ink">${accountSize.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-ink/50">Risk per trade</span>
        <span className="font-bold font-nums text-ink">{riskPercent}% (${(accountSize * riskPercent / 100).toFixed(2)})</span>
      </div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs text-ink/50">Stop-loss distance (pips)</span>
        <input
          type="number" value={stopLossPips} min={1}
          onChange={(e) => setStopLossPips(+e.target.value)}
          className="w-20 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-right outline-none text-ink"
        />
      </div>
      {lot && (
        <div className="rounded-lg px-3.5 py-3 flex items-center justify-between bg-mist">
          <span className="text-xs font-semibold text-royal-dark">Suggested lot size</span>
          <span className="text-lg font-extrabold font-nums text-royal">{lot.lots} lots</span>
        </div>
      )}
      <p className="text-[10px] mt-2 text-ink/30">Approximate — assumes ~$10/pip per standard lot; confirm exact pip value with your broker.</p>
    </div>
  );
}
