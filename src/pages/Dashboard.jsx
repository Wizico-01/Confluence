import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Bell, Circle, Settings, Wifi, WifiOff, BellRing } from "lucide-react";
import SetupPanel from "../components/dashboard/SetupPanel.jsx";
import TierCard from "../components/dashboard/TierCard.jsx";
import ChecklistPanel from "../components/dashboard/ChecklistPanel.jsx";
import RiskPanel from "../components/dashboard/RiskPanel.jsx";
import AlertLog from "../components/dashboard/AlertLog.jsx";
import FibPanel from "../components/dashboard/FibPanel.jsx";
import ChartUploadPanel from "../components/dashboard/ChartUploadPanel.jsx";
import { buildLiveAnalysis } from "../engine/dataProvider.js";
import { fetchCandles } from "../lib/api.js";
import { FOREX_SYMBOLS, CASCADES, fmtPrice } from "../engine/symbols.js";

const TF_MAP = { Monthly: "1month", Weekly: "1week", Daily: "1day", "4H": "4h", "1H": "1h", "30M": "30min", "15M": "15min", "1M/5M": "5min" };

// Twelve Data's free plan allows 8 calls/minute. Each cascade refresh makes
// one call per tier (4 tiers), so refreshing faster than ~30s will hit that
// limit. True second-by-second updates need a paid streaming plan — this
// interval is the fastest sustainable rate on the free tier.
const AUTO_REFRESH_MS = 30000;

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [symbol, setSymbol] = useState("EURUSD");
  const [refreshTick, setRefreshTick] = useState(0);
  const [stopLossPips, setStopLossPips] = useState(20);
  const [alarmLog, setAlarmLog] = useState([]);
  const [visionByTier, setVisionByTier] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [liveDataOk, setLiveDataOk] = useState(true);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const lastNotifiedRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
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
  }, [profile, symbol, refreshTick, visionByTier]);

  // Auto-refresh on a timer, on top of the manual Refresh button.
  useEffect(() => {
    if (!profile) return;
    const id = setInterval(() => setRefreshTick((t) => t + 1), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [profile]);

  // Fire a browser notification once confluence reaches "Strong" (5+) —
  // only once per distinct setup, not on every refresh tick, so it doesn't
  // spam the same signal repeatedly.
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
            <div className="flex items-center gap-3">
              {notifPermission !== "granted" && notifPermission !== "unsupported" && (
                <button onClick={requestNotifications} className="flex items-center gap-1 text-white/90 text-xs font-semibold bg-white/15 rounded-full px-3 py-1.5">
                  <BellRing size={13} /> Enable alerts
                </button>
              )}
              <button onClick={() => setProfile(null)} className="text-white/80"><Settings size={18} /></button>
            </div>
          </div>

          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mb-1.5">Market</p>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full mb-4 rounded-xl bg-white/15 text-white text-sm font-bold px-3.5 py-2.5 outline-none border border-white/20"
          >
            {FOREX_SYMBOLS.map((s) => (
              <option key={s} value={s} className="text-ink">{s}</option>
            ))}
          </select>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">Live price (Twelve Data)</p>
                {liveDataOk ? <Wifi size={11} className="text-white/60" /> : <WifiOff size={11} className="text-gold" />}
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