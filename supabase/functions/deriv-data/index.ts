// Supabase Edge Function: deriv-data
//
// Deriv's synthetic indices (Volatility 75/100, Boom/Crash, etc.) are
// algorithmically generated and are NOT available from Twelve Data or any
// standard forex/stock data provider. Deriv publishes its own free,
// public WebSocket API for this — no paid key required, just an app_id
// registered at https://api.deriv.com/. This function opens a short-lived
// WebSocket connection, requests candle history for one symbol/granularity,
// and returns it as plain JSON so the frontend can call it the same way it
// calls market-data for forex.
//
// Deploy:  supabase functions deploy deriv-data
// Secrets: supabase secrets set DERIV_APP_ID=your-app-id
//   (Deriv's own public demo app_id "1089" works for read-only market data
//   during development — register your own app_id before going live.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const DERIV_APP_ID = Deno.env.get("DERIV_APP_ID") ?? "1089";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fetchDerivCandles(derivSymbol: string, granularitySeconds: number, count: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Deriv API timed out"));
    }, 8000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        ticks_history: derivSymbol,
        adjust_start_time: 1,
        count,
        end: "latest",
        granularity: granularitySeconds,
        style: "candles",
      }));
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.error) {
        clearTimeout(timeout);
        ws.close();
        return reject(new Error(data.error.message));
      }
      if (data.candles) {
        clearTimeout(timeout);
        ws.close();
        resolve(data.candles.map((c: any) => ({
          open: +c.open, high: +c.high, low: +c.low, close: +c.close, epoch: c.epoch,
        })));
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Deriv WebSocket error"));
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error } = await supabaseAuth.auth.getUser();
    if (error || !userData?.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("subscription_status")
      .eq("id", userData.user.id)
      .single();
    if (profile?.subscription_status !== "active") {
      return new Response(JSON.stringify({ error: "Subscription required" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { derivSymbol, granularitySeconds, count = 60 } = await req.json();
    if (!derivSymbol || !granularitySeconds) {
      return new Response("Missing derivSymbol or granularitySeconds", { status: 400, headers: corsHeaders });
    }

    const candles = await fetchDerivCandles(derivSymbol, granularitySeconds, count);
    return new Response(JSON.stringify({ candles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});