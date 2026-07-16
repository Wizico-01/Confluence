import React, { useState } from "react";
import { Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient.js";
import { callEdgeFunction } from "../../lib/api.js";

// Lets a trader upload a chart screenshot for each timeframe their cascade
// requires (e.g. Daily, 4H, 1H, 15M for a day trader), and sends each one
// to the analyze-chart-image edge function for an AI vision read (trend,
// visible structure, candlestick pattern) as a cross-check against the
// live-data cascade above.
export default function ChartUploadPanel({ tiers, symbol, onResult, missingTiers = [] }) {
  const [uploads, setUploads] = useState({}); // tierName -> { status, preview, result, error }

  async function handleFile(tierName, file) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setUploads((u) => ({ ...u, [tierName]: { status: "uploading", preview } }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      const path = `${userId}/${symbol}-${tierName}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("chart-uploads")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;

      setUploads((u) => ({ ...u, [tierName]: { status: "analyzing", preview } }));

      const { data: signedUrlData } = await supabase.storage
        .from("chart-uploads")
        .createSignedUrl(path, 60);

      const result = await callEdgeFunction("analyze-chart-image", {
        imageUrl: signedUrlData.signedUrl,
        symbol,
        timeframe: tierName,
      });

      setUploads((u) => ({ ...u, [tierName]: { status: "done", preview, result } }));
      onResult?.(tierName, result);
    } catch (err) {
      console.error(err);
      setUploads((u) => ({ ...u, [tierName]: { status: "error", preview, error: err.message } }));
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Camera size={15} className="text-royal" />
        <p className="text-sm font-bold text-ink">Upload chart screenshots</p>
      </div>
      <p className="text-xs text-ink/40 mb-4">
        Optional — upload a landscape screenshot for each timeframe below and get an AI read
        as a second opinion alongside the live cascade above.
      </p>
      {missingTiers.length > 0 && (
        <div className="mb-4 rounded-lg bg-gold/10 px-3 py-2">
          <p className="text-xs font-semibold text-gold">
            Live data wasn't available for {missingTiers.join(", ")} — upload a screenshot for {missingTiers.length > 1 ? "these timeframes" : "this timeframe"} so the cascade has something to work with.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {tiers.map((tier) => {
          const u = uploads[tier.name];
          return (
            <label key={tier.name} className="block cursor-pointer">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{tier.role} · {tier.name}</span>
              <div className="mt-1.5 rounded-lg border border-dashed border-line aspect-video flex items-center justify-center overflow-hidden bg-mist relative">
                {u?.preview ? (
                  <img src={u.preview} alt={`${tier.name} chart`} className="w-full h-full object-cover" />
                ) : (
                  <Camera size={18} className="text-ink/20" />
                )}
                {u?.status === "uploading" || u?.status === "analyzing" ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={18} className="text-white animate-spin" />
                  </div>
                ) : null}
                {u?.status === "done" && (
                  <div className="absolute top-1 right-1 bg-white rounded-full p-0.5">
                    <CheckCircle2 size={14} className="text-bull" />
                  </div>
                )}
                {u?.status === "error" && (
                  <div className="absolute top-1 right-1 bg-white rounded-full p-0.5">
                    <AlertCircle size={14} className="text-bear" />
                  </div>
                )}
              </div>
              <input
                type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => handleFile(tier.name, e.target.files?.[0])}
              />
              {u?.status === "done" && u.result?.summary && (
                <p className="text-[11px] text-ink/60 mt-1 leading-snug">{u.result.summary}</p>
              )}
              {u?.status === "error" && (
                <p className="text-[11px] text-bear mt-1">{u.error}</p>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
