import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid, Bell, Shield, GitBranch } from "lucide-react";

const CASCADE_PREVIEW = [
  { label: "Monthly", role: "Bias", trend: "Uptrend", color: "bg-bull" },
  { label: "Weekly", role: "Direction", trend: "Uptrend", color: "bg-bull" },
  { label: "Daily", role: "Trend", trend: "Range", color: "bg-royal" },
  { label: "4H", role: "Entry", trend: "Bullish Engulfing", color: "bg-gold" },
];

const FEATURES = [
  { icon: GitBranch, title: "Top-down cascade", body: "Bias, direction, trend, and entry — each timeframe checked in order, the way disciplined traders actually work." },
  { icon: LayoutGrid, title: "Structure-aware", body: "HH/HL, LH/LL, and break-of-structure with mandatory retest, so a single wick can't fake you into a trade." },
  { icon: Bell, title: "Confluence alerts", body: "Only alarms once trend, structure, key levels, and a reversal candlestick line up — 4 minimum, scored out of 7." },
  { icon: Shield, title: "Risk built in", body: "Set your account size and risk appetite once; every setup comes with a ready-to-use lot size." },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-royal-deep">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-wide text-white/60 mb-4">
              Multi-timeframe trade analysis
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight">
              Trade the setup, not the noise.
            </h1>
            <p className="text-white/70 mt-5 text-base md:text-lg max-w-md">
              Confluence runs your top-down analysis across every timeframe automatically —
              trend, structure, key levels, and candlestick confirmation — and only alerts you
              when enough of them agree.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex items-center gap-1.5 bg-white text-royal-deep font-bold text-sm px-5 py-3 rounded-xl">
                Start free trial <ArrowRight size={16} />
              </Link>
              <Link to="/how-it-works" className="inline-flex items-center gap-1.5 text-white font-semibold text-sm px-5 py-3 rounded-xl border border-white/25">
                See how it works
              </Link>
            </div>
          </div>

          {/* Signature element: the cascade collapsing into a confirmed entry */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-4">EURUSD · Day trader cascade</p>
            <div className="space-y-2.5">
              {CASCADE_PREVIEW.map((tier, i) => (
                <div key={tier.label} className={`flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3 animate-cascade-${i + 1}`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">{tier.role}</p>
                    <p className="text-sm font-bold text-white">{tier.label}</p>
                  </div>
                  <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${tier.color}`}>{tier.trend}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-royal px-4 py-3 flex items-center justify-between animate-cascade-4">
              <span className="text-white text-sm font-bold">Confluence: 5/7 · Strong</span>
              <Bell size={16} className="text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-ink text-center max-w-xl mx-auto">
          Everything your top-down process needs, running in the background.
        </h2>
        <div className="grid sm:grid-cols-2 gap-5 mt-12">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line p-6">
              <div className="w-10 h-10 rounded-lg bg-mist flex items-center justify-center mb-4">
                <f.icon size={18} className="text-royal" />
              </div>
              <h3 className="font-bold text-ink mb-1.5">{f.title}</h3>
              <p className="text-sm text-ink/60 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-mist border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-16 text-center">
          <h2 className="font-display text-2xl font-bold text-ink">Stop staring at four charts at once.</h2>
          <p className="text-ink/60 mt-2 max-w-md mx-auto">Set your style and risk profile once. Let the cascade tell you when it's actually worth looking.</p>
          <Link to="/signup" className="inline-flex items-center gap-1.5 bg-royal text-white font-bold text-sm px-6 py-3 rounded-xl mt-6">
            Start your free trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
