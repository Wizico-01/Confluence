import React from "react";
import { Check } from "lucide-react";

export default function PricingCard({ plan, onSelect, loading }) {
  return (
    <div
      className={`rounded-2xl p-7 border flex flex-col ${
        plan.highlight ? "border-royal shadow-xl shadow-royal/10 bg-white" : "border-line bg-white"
      }`}
    >
      {plan.highlight && (
        <span className="self-start text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-royal text-white mb-3">
          Most popular
        </span>
      )}
      <h3 className="font-display text-lg font-bold text-ink">{plan.name}</h3>
      <p className="text-sm text-ink/60 mt-1">{plan.description}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-ink">₦{plan.priceNaira.toLocaleString()}</span>
        <span className="text-sm text-ink/50">/ month</span>
      </div>
      <ul className="mt-6 space-y-2.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink/80">
            <Check size={16} className="text-bull mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(plan)}
        disabled={loading}
        className={`mt-7 w-full py-3 rounded-xl text-sm font-bold ${
          plan.highlight ? "bg-royal text-white" : "bg-mist text-ink"
        }`}
      >
        {loading ? "Redirecting…" : `Subscribe to ${plan.name}`}
      </button>
    </div>
  );
}
