import React from "react";
import { Link } from "react-router-dom";

const STEPS = [
  {
    title: "1. Pick your trading style",
    body: "Swing, day, or scalp — each maps to its own four-tier cascade, from a monthly bias down to a 1-minute entry. The cascade is fixed per style so nothing gets skipped.",
    tiers: "Swing: Monthly → Weekly → Daily → 4H  ·  Day: Daily → 4H → 1H → 15M  ·  Scalp: 1H → 30M → 15M → 1M/5M",
  },
  {
    title: "2. The cascade reads structure top-down",
    body: "Each timeframe is checked for higher highs & higher lows (uptrend), lower highs & lower lows (downtrend), or flat highs/lows (range) — the same read a discretionary trader would do by eye.",
  },
  {
    title: "3. Break of structure needs a retest",
    body: "A structure break alone isn't enough. Confluence waits for price to retest the broken level before treating the shift as valid — no reacting to the first wick.",
  },
  {
    title: "4. Key levels merge psychology with structure",
    body: "Round-number psychological levels are checked against swing highs/lows. When they overlap, that level is marked as a stronger, merged zone.",
  },
  {
    title: "5. Entry needs a reversal candle — always",
    body: "Even with everything else aligned, no alert fires without a confirming reversal pattern on the entry timeframe: engulfing, hammer, shooting star, doji, morning/evening star, tweezer, or harami.",
  },
  {
    title: "6. Fibonacci retracement adds another layer",
    body: "Confluence measures the most recent swing on your entry timeframe and checks whether price is sitting at the 50.0% or 61.8% retracement — the two levels that count toward your score. Other levels are shown for reference only.",
  },
  {
    title: "7. Confluence score gates the alarm",
    body: "Every factor above is one point, out of 8. Below 4 is Weak and stays silent. 4 is the minimum to alert (Good); 5–6 is Strong; 7–8 is Very Strong.",
  },
  {
    title: "8. Risk sizing is automatic",
    body: "Tell it your account size and whether you trade conservative (2%) or aggressive (3–5%) risk. Every setup comes with a ready lot size for your stop distance.",
  },
  {
    title: "9. Upload your own chart screenshots (optional)",
    body: "For each timeframe your cascade needs, you can upload a landscape screenshot straight from your phone or broker platform. An AI vision read gives you a second opinion — trend, visible structure, and any obvious candlestick — alongside the live cascade above.",
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-royal">How it works</span>
      <h1 className="font-display text-3xl font-bold text-ink mt-2">A disciplined top-down process, automated.</h1>
      <p className="text-ink/60 mt-3 max-w-xl">
        Confluence doesn't predict the market — it runs the same top-down checklist a careful trader
        would run by hand, consistently, across every pair you watch.
      </p>

      <div className="mt-12 space-y-10">
        {STEPS.map((s) => (
          <div key={s.title} className="border-l-2 border-line pl-5">
            <h3 className="font-bold text-ink">{s.title}</h3>
            <p className="text-sm text-ink/60 mt-1.5 leading-relaxed">{s.body}</p>
            {s.tiers && <p className="text-xs text-royal-dark font-semibold mt-2">{s.tiers}</p>}
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl bg-mist p-6 text-center">
        <p className="font-bold text-ink">Ready to see it on your own pairs?</p>
        <Link to="/pricing" className="inline-block mt-3 bg-royal text-white font-bold text-sm px-5 py-2.5 rounded-xl">
          View plans
        </Link>
      </div>
    </div>
  );
}
