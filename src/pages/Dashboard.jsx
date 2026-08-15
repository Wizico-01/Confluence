import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Bell, Circle, Settings, Wifi, WifiOff, BellRing, GitBranch, Target, TrendingUp, Activity, Search } from "lucide-react";
import SetupPanel from "../components/dashboard/SetupPanel.jsx";
import TierCard from "../components/dashboard/TierCard.jsx";
import ChecklistPanel from "../components/dashboard/ChecklistPanel.jsx";
import RiskPanel from "../components/dashboard/RiskPanel.jsx";
import AlertLog from "../components/dashboard/AlertLog.jsx";
import FibPanel from "../components/dashboard/FibPanel.jsx";
import { buildLiveAnalysis } from "../engine/dataProvider.js";
import { fetchCandles } from "../lib/api.js";
import { FOREX_SYMBOLS, CASCADES, fmtPrice } from "../engine/symbols.js";

const TF_MAP = {
  Monthly: "1month", Weekly: "1week", Daily: "1day",
  "4H": "4h", "1H": "1h", "30M": "30min", "15M": "15min", "1M/5M": "5min",
};

const AUTO_REFRESH_MS = 30000;
const ONBOARD_MS = 7000;
const ANALYZE_MS = 20000;

const ONBOARD_SLIDES = [
  { icon: GitBranch, title: "Top-down cascade", desc: "Bias, direction, trend, and entry, checked in order." },
  { icon: Target, title: "Confluence scoring", desc: "8 factors, always weighing what's real." },
  { icon: TrendingUp, title: "Trend-following signals", desc: "Entries always follow the trend, never fight it." },
];

const ANALYZE_SLIDES = [
  { icon: GitBranch, title: "Reading the top-down cascade", desc: "Checking bias, direction, and trend across every timeframe." },
  { icon: Activity, title: "Mapping market structure", desc: "Finding higher highs, higher lows, and breaks of structure." },
  { icon: Target, title: "Locking psychological levels", desc: "Matching round-number levels with real structure." },
  { icon: TrendingUp, title: "Measuring Fibonacci retracement", desc: "Checking the 50% and 61.8% pullback zones." },
  { icon: Bell, title: "Scanning for reversal candlesticks", desc: "Engulfing, harami, pin bars, and more, always with the trend." },
];

function SpinnerSplash({ slides, index, subtitle }) {
  const slide = slides[index % slides.length];
  const Icon = slide.icon;
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-royal-deep px-6">
      <div className="text-center max-w-xs">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin" />
          <div key={index} className="absolute inset-0 flex items-center justify-center animate-cascade-1">
            <Icon size={32} className="text-white" />
          </div>
        </div>
        {subtitle && <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-2">{subtitle}</p>}
        <p key={`t-${index}`} className="text-white font-bold text-base animate-cascade-2">{slide.title}</p>
        <p key={`d-${index}`} className="text-white/60 text-sm mt-2 animate-cascade-3">{slide.desc}</p>
        <div className="flex items-center justify-center gap-1.5 mt-8">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === index % slides.length ? "w-6 bg-white" : "w-1.5 bg-white/30"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [symbol, setSymbol] = useState(null); // only set once "Analyze" is tapped
  const [refreshTick, setRefreshTick] = useState(0);
  const [stopLossPips, setStopLossPips] = useState(20);
  const [alarmLog, setAlarmLog] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [liveDataOk, setLiveDataOk] = useState(true);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const lastNotifiedRef = useRef(null);
  const triggerSourceRef = useRef("manual");

  const [showOnboard, setShowOnboard] = useState(true);
  const [onboardIndex, setOnboardIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeIndex, setAnalyzeIndex] = useState(0);
  const [analyzeCountdown, setAnalyzeCountdown] = useState(ANALYZE_MS / 1000);

  useEffect(() => {
    if (!profile) return;
    const rotate = setInterval(() => setOnboardIndex((i) => i + 1), 1800);
    const done = setTimeout(() => setShowOnboard(false), ONBOARD_MS);
    return () => { clearInterval(rotate); clearTimeout(done); };
  }, [profile]);

  useEffect(() => {
    if (!isAnalyzing) return;
    setAnalyzeIndex(0);
    setAnalyzeCountdown(ANALYZE_MS / 1000);
    const rotate = setInterval(() => setAnalyzeIndex((i) => i + 1), 1600);
    const tick = setInterval(() => setAnalyzeCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => { clearInterval(rotate); clearInterval(tick); };
  }, [isAnalyzing]);

  useEffect(() => {
    if (!profile || !symbol) return;
    const controller = new AbortController();
    const { signal } = controller;
    const isManual = triggerSourceRef.current === "manual";
    const analyzeStart = Date.now();
    if (isManual) setIsAnalyzing(true);

    (async () => {
      let anyLive = false;
      const getTierCandles = async (tierName) => {
        try {
          const { values } = await fetchCandles({ symbol, interval: TF_MAP[tierName], outputsize: 60, signal });
          if (!values) return null;
          anyLive = true;
          return values.map((v) => ({ open: +v.open, high: +v.high, low: +v.low, close: +v.close })).reverse();
        } catch (err) {
          if (err.name === "AbortError" || err.message?.includes("aborted")) return null;
          console.error(`Fetch failed for ${symbol} ${tierName}:`, err.message);
          return null;
        }
      };

      const result = await buildLiveAnalysis(symbol, profile.style, getTierCandles);
      if (signal.aborted) return;

      const elapsed = Date.now() - analyzeStart;
      const finish = () => {
        setAnalysis(result);
        setLiveDataOk(anyLive);
        setIsAnalyzing(false);
      };
      if (isManual && elapsed < ANALYZE_MS) setTimeout(finish, ANALYZE_MS - elapsed);
      else finish();
    })();

    return () => { controller.abort(); };
  }, [profile, symbol, refreshTick]);

  useEffect(() => {
    if (!profile || !symbol) return;
    const id = setInterval(() => {
      triggerSourceRef.current = "auto";
      setRefreshTick((t) => t + 1);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [profile, symbol]);

  useEffect(() => {
    if (!analysis || notifPermission !== "granted") return;
    if (analysis.score >= 5 && analysis.alarmActive) {
      const signature = `${symbol}-${analysis.entryTierName}-${analysis.pattern?.name}-${analysis.score}`;
      if (lastNotifiedRef.current !== signature) {
        lastNotifiedRef.current = signature;
        new Notification(`Confluence: Strong setup on ${symbol}`, {
          body: `${analysis.entryTierName} entry · ${analysis.score}/${analysis.total} confluence · ${analysis.pattern?.name ?? ""}`,
        });
      }
    }
  }, [analysis, symbol, notifPermission]);

  const requestNotifications = useCallback(() => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  }, []);

  const runAnalysis = useCallback((sym) => {
    triggerSourceRef.current = "manual";
    setSymbol(sym);
    setRefreshTick((t) => t + 1);
  }, []);

  const logAlarm = useCallback(() => {
    if (!analysis) return;
    setAlarmLog((log) =>
      [{ symbol, tf: analysis.entryTierName, score: analysis.score, pattern: analysis.pattern?.name, time: new Date().toLocaleTimeString() }, ...log].slice(0, 6)
    );
  }, [analysis, symbol]);

  if (!profile) {
    return (
      <div className="bg-white min-h-[70vh] flex items-center px-5 py-14">
        <SetupPanel onComplete={setProfile} />
      </div>
    );
  }

  if (showOnboard) {
    return <SpinnerSplash slides={ONBOARD_SLIDES} index={onboardIndex} subtitle="Welcome to Confluence" />;
  }

  if (isAnalyzing) {
    return <SpinnerSplash slides={ANALYZE_SLIDES} index={analyzeIndex} subtitle={`Analysing ${symbol} · ${analyzeCountdown}s`} />;
  }

  const cascade = CASCADES[profile.style];

  return (
    <div className="bg-mist min-h-[80vh] pb-10">
      <div className="bg-royal">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-display font-bold text-lg">{cascade?.label ?? "Trading"} cascade</span>
            <div className="flex items-center gap-3">
              {notifPermission !== "granted" && notifPermission !== "unsupported" && (
                <button onClick={requestNotifications} title="Get notified the moment price reaches a confirmed entry zone with 5+ confluence" className="flex items-center gap-1 text-white/90 text-xs font-semibold bg-white/15 rounded-full px-3 py-1.5 transition-colors hover:bg-white/25">
                  <BellRing size={13} /> Notify me at entry zone
                </button>
              )}
              <button onClick={() => { setProfile(null); setSymbol(null); setAnalysis(null); }} className="text-white/80 hover:text-white transition-colors" aria-label="Settings">
                <Settings size={18} />
              </button>
            </div>
          </div>

          <label htmlFor="symbol-select" className="text-white/50 text-[10px] font-bold uppercase tracking-wide mb-1.5 block">
            Market
          </label>
          <select
            id="symbol-select"
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full mb-3 rounded-xl bg-white/15 text-white text-sm font-bold px-3.5 py-2.5 outline-none border border-white/20 focus:border-white/50 transition-colors"
          >
            {FOREX_SYMBOLS.map((s) => (
              <option key={s} value={s} className="text-ink">{s}</option>
            ))}
          </select>

          <button
            onClick={() => runAnalysis(selectedSymbol)}
            className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-white text-royal font-bold text-sm py-3 transition-transform active:scale-[0.99]"
          >
            <Search size={16} /> Analyze {selectedSymbol}
          </button>

          {symbol && analysis && (
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">Live price (Twelve Data)</p>
                  {liveDataOk ? <Wifi size={11} className="text-white/60" /> : <WifiOff size={11} className="text-gold" />}
                </div>
                <p className="text-white text-2xl font-extrabold font-nums">{fmtPrice(symbol, analysis.livePrice)}</p>
              </div>
              <button onClick={() => runAnalysis(symbol)} className="flex items-center gap-1.5 text-white/90 text-xs font-semibold bg-white/15 rounded-full px-3 py-2 transition-colors hover:bg-white/25">
                <RefreshCw size={13} /> Analyze
              </button>
            </div>
          )}
        </div>
      </div>

      {!symbol || !analysis ? (
        <div className="max-w-3xl mx-auto px-5 mt-8 text-center">
          <p className="text-sm text-ink/50">Pick a market above and tap Analyze to run the cascade.</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-5 mt-5 space-y-5">
          {analysis.alarmActive ? (
            <button onClick={logAlarm} className="w-full text-left rounded-xl p-4 flex items-center gap-3 bg-royal transition-transform active:scale-[0.99]">
              <Bell size={20} className="text-white" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Setup confirmed — {analysis.pattern?.name}</p>
                <p className="text-white/80 text-xs">{analysis.entryTierName} entry · {analysis.score}/{analysis.total} confluence · tap to log alert</p>
              </div>
            </button>
          ) : (
            <div className="rounded-xl p-4 flex items-center gap-3 border border-line bg-white">
              <Circle size={18} className="text-line" />
              <p className="text-sm font-medium text-ink/50">
                {analysis.tradePlan?.zoneStatus === "missed" || analysis.tradePlan?.zoneStatus === "insufficient"
                  ? analysis.tradePlan.zoneMessage
                  : "No confirmed entry yet, waiting on confluence and candlestick confirmation."}
              </p>
            </div>
          )}

          {analysis.tradePlan && (
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-ink">
                  Trade plan — {analysis.tradePlan.direction === "buy" ? "Buy" : "Sell"}
                  {!analysis.tradePlan.confirmed && <span className="text-ink/40 font-medium"> (prospective)</span>}
                  {analysis.tradePlan.fibAligns && <span className="text-royal font-medium"> · Fib + psych level aligned</span>}
                </p>
                {analysis.tradePlan.riskReward && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-royal/10 text-royal">1:{analysis.tradePlan.riskReward} R:R</span>
                )}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink/50">Entry</span>
                  <span className="font-bold font-nums text-ink">{fmtPrice(symbol, analysis.tradePlan.entryPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink/50">Stop loss</span>
                  <span className="font-bold font-nums text-bear">{fmtPrice(symbol, analysis.tradePlan.stopLoss)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink/50">Take profit (psych level)</span>
                  <span className="font-bold font-nums text-bull">{analysis.tradePlan.takeProfit != null ? fmtPrice(symbol, analysis.tradePlan.takeProfit) : "—"}</span>
                </div>
              </div>
              <div
                className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  background: analysis.tradePlan.zoneStatus === "at_zone" ? "#E6F7EF" : analysis.tradePlan.zoneStatus === "missed" ? "#FDECEF" : "#FFF6DD",
                  color: analysis.tradePlan.zoneStatus === "at_zone" ? "#0E9F6E" : analysis.tradePlan.zoneStatus === "missed" ? "#E11D48" : "#D69E00",
                }}
              >
                {analysis.tradePlan.zoneMessage}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2 text-ink/40">Top-down cascade</p>
            <div className="space-y-2.5">
              {analysis.tiers.map((tier) => <TierCard key={tier.name} tier={tier} />)}
            </div>
          </div>

          <ChecklistPanel checklist={analysis.checklist} score={analysis.score} strength={analysis.strength} />
          <FibPanel fib={analysis.fib} symbol={symbol} decimals={analysis.decimals} />
          <RiskPanel accountSize={profile.accountSize} riskPercent={profile.riskPercent} stopLossPips={stopLossPips} setStopLossPips={setStopLossPips} symbol={symbol} />
          <AlertLog log={alarmLog} />
        </div>
      )}
    </div>
  );
}