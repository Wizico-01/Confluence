import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Bell, Circle, Settings, Wifi, WifiOff } from "lucide-react";
import SetupPanel from "../components/dashboard/SetupPanel.jsx";
import TierCard from "../components/dashboard/TierCard.jsx";
import ChecklistPanel from "../components/dashboard/ChecklistPanel.jsx";
import RiskPanel from "../components/dashboard/RiskPanel.jsx";
import AlertLog from "../components/dashboard/AlertLog.jsx";
import FibPanel from "../components/dashboard/FibPanel.jsx";
import ChartUploadPanel from "../components/dashboard/ChartUploadPanel.jsx";
import { buildAnalysis, buildLiveAnalysis } from "../engine/dataProvider.js";
import { aggregateCandles } from "../engine/structure.js";
import { fetchDerivCandles, fetchCandles } from "../lib/api.js";
import {
  FOREX_SYMBOLS, SYNTHETIC_SYMBOLS, CASCADES, isSynthetic,
  DERIV_SYMBOL_CODES, TIER_GRANULARITY_SECONDS, fmtPrice,
} from "../engine/symbols.js";

// Fetches candles for one cascade tier from Deriv. Monthly/Weekly have no
// native Deriv granularity, so those are built by aggregating daily candles
// (see TIER_GRANULARITY_SECONDS + aggregateCandles).
async function getDerivTierCandles(symbol, tierName) {
  const spec = TIER_GRANULARITY_SECONDS[tierName];
  const derivSymbol = DERIV_SYMBOL_CODES[symbol];
  try {
    if (spec.seconds) {
      const { candles } = await fetchDerivCandles({ derivSymbol, granularitySeconds: spec.seconds, count: 60 });
      return candles;
    }
    // Monthly/Weekly: fetch daily candles, then group into buckets.
    const { candles: daily } = await fetchDerivCandles({ derivSymbol, granularitySeconds: 86400, count: spec.aggregate * 30 });
    return aggregateCandles(daily, spec.aggregate);
  } catch (err) {
    console.error(`Deriv fetch failed for ${symbol} ${tierName}:`, err.message);
    return null; // signals buildLiveAnalysis to fall back to photo upload for this tier
  }
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [symbol, setSymbol] = useState("EURUSD");
  const [refreshTick, setRefreshTick] = useState(0);
  const [stopLossPips, setStopLossPips] = useState(20);
  const [alarmLog, setAlarmLog] = useState([]);
  const [visionByTier, setVisionByTier] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [liveDataOk, setLiveDataOk] = useState(true);

  const synthetic = isSynthetic(symbol);

  // Live-data pathway (forex, via Twelve Data).
  useEffect(() => {
    if (!profile || synthetic) return;
    let cancelled = false;
    const TF_MAP = { Monthly: "1month", Weekly: "1week", Daily: "1day", "4H": "4h", "1H": "1h", "30M": "30min", "15M": "15min", "1M/5M": "5min" };
    (async () => {
      let anyLive = false;
      const getTierCandles = async (tierName) => {
        try {
          const { values } = await fetchCandles({ symbol, interval: TF_MAP[tierName], outputsize: 60 });
          if (!values) return null;
          anyLive = true;
          return values.map((v) => ({ open: +v.open, high: +v.high, low: +v.low, close: +v.close })).reverse();
        } catch (err) {
          console.error(`Twelve Data fetch failed for ${symbol} ${tierName}:`, err.message);
          return null;
        }
      };
      const result = await buildLiveAnalysis(symbol, profile.style, getTierCandles, visionByTier);
      if (!cancelled) { setAnalysis(result); setLiveDataOk(anyLive); }
    })();
    return () => { cancelled = true; };
  }, [profile, symbol, refreshTick, synthetic, visionByTier]);

  // Live-data pathway (Deriv synthetic indices) — async, with photo fallback.
  useEffect(() => {
    if (!profile || !synthetic) return;
    let cancelled = false;
    (async () => {
      let anyLive = false;
      const getTierCandles = async (tierName) => {
        const candles = await getDerivTierCandles(symbol, tierName);
        if (candles) anyLive = true;
        return candles;
      };
      const result = await buildLiveAnalysis(symbol, profile.style, getTierCandles, visionByTier);
      if (!cancelled) {
        setAnalysis(result);
        setLiveDataOk(anyLive);
      }
    })();
    return () => { cancelled = true; };
  }, [profile, symbol, refreshTick, synthetic, visionByTier]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const logAlarm = useCallback(() => {
    if (!analysis) return;
    setAlarmLog((log) =>
      [{ symbol, tf: analysis.entryTierName, score: analysis.score, pattern: analysis.pattern?.name, time: new Date().toLocaleTimeString() }, ...log].slice(0, 6)
    );
  }, [analysis, symbol]);

  const handleVisionResult = useCallback((tierName, result) => {
    setVisionByTier((v) => ({ ...v, [tierName]: result }));
  }, []);

  if (!profile) {
    return (
      <div className="bg-white min-h-[70vh] flex items-center px-5 py-14">
        <SetupPanel onComplete={setProfile} />
      </div>
    );
  }

  if (!analysis) {
    return <div className="py-24 text-center text-ink/50 text-sm">Loading cascade…</div>;
  }

  const cascade = CASCADES[profile.style];
  const missingTiers = analysis.tiers.filter((t) => t.source === "missing").map((t) => t.name);

  return (
    <div className="bg-mist min-h-[80vh] pb-10">
      <div className="bg-royal">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-display font-bold text-lg">{cascade.label} cascade</span>
            <button onClick={() => setProfile(null)} className="text-white/80"><Settings size={18} /></button>
          </div>

          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mb-1.5">Forex</p>
          <div className="flex items-center gap-2 mb-3 overflow-x-auto">
            {FOREX_SYMBOLS.map((s) => (
              <button key={s} onClick={() => setSymbol(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${symbol === s ? "bg-white text-royal" : "bg-white/15 text-white"}`}>
                {s}
              </button>
            ))}
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mb-1.5">Synthetic indices</p>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {SYNTHETIC_SYMBOLS.map((s) => (
              <button key={s} onClick={() => setSymbol(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${symbol === s ? "bg-white text-royal" : "bg-white/15 text-white"}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">
                 {synthetic ? "Live price (Deriv)" : "Live price (Twelve Data)"}
                </p>
                {(liveDataOk ? <Wifi size={11} className="text-white/60" /> : <WifiOff size={11} className="text-gold" />)}
              </div>
              <p className="text-white text-2xl font-extrabold font-nums">{fmtPrice(symbol, analysis.livePrice)}</p>
            </div>
            <button onClick={refresh} className="flex items-center gap-1.5 text-white/90 text-xs font-semibold bg-white/15 rounded-full px-3 py-2">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 mt-5 space-y-5">
        {analysis.alarmActive ? (
          <button onClick={logAlarm} className="w-full text-left rounded-xl p-4 flex items-center gap-3 bg-royal">
            <Bell size={20} color="#fff" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Setup confirmed — {analysis.pattern.name}</p>
              <p className="text-white/80 text-xs">{analysis.entryTierName} entry · {analysis.score}/{analysis.total} confluence · tap to log alert</p>
            </div>
          </button>
        ) : (
          <div className="rounded-xl p-4 flex items-center gap-3 border border-line bg-white">
            <Circle size={18} className="text-line" />
            <p className="text-sm font-medium text-ink/50">No confirmed entry yet — waiting on confluence and candlestick confirmation.</p>
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
        <ChartUploadPanel tiers={analysis.tiers} symbol={symbol} onResult={handleVisionResult} missingTiers={missingTiers} />
        <AlertLog log={alarmLog} />
      </div>
    </div>
  );
}
