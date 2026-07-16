import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

const STRENGTH_STYLE = {
  Weak: { bg: "#F1F2F8", fg: "#7B84B5" },
  Good: { bg: "#E6F7EF", fg: "#0E9F6E" },
  Strong: { bg: "#E7ECFF", fg: "#1A33E8" },
  "Very Strong": { bg: "#1A33E8", fg: "#FFFFFF" },
};

export default function ChecklistPanel({ checklist, score, strength }) {
  const s = STRENGTH_STYLE[strength];
  const total = checklist.length;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-ink">Confluence score</p>
        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.fg }}>
          {score}/{total} · {strength}
        </span>
      </div>
      <div className="divide-y divide-line">
        {checklist.map((item) => (
          <div key={item.key} className="flex items-start gap-2 py-1.5">
            {item.pass ? <CheckCircle2 size={16} className="text-bull mt-0.5 shrink-0" /> : <Circle size={16} className="text-line mt-0.5 shrink-0" />}
            <span className={`text-[13px] ${item.pass ? "text-ink" : "text-ink/40"}`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
