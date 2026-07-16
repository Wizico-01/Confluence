// Supabase Edge Function: market-data
//
// Proxies OHLC candle requests to your market data provider (Twelve Data
// shown here) so the real API key lives only as a server-side secret and
// is never shipped to the browser. Also lets you enforce the user's
// subscription status before returning data.
//
// Deploy:  supabase functions deploy market-data
// Secrets: supabase secrets set TWELVE_DATA_API_KEY=your-key

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TWELVE_DATA_API_KEY = Deno.env.get("TWELVE_DATA_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Gate on subscription status so free/unpaid accounts can't pull data
    // straight through the function even if they know the endpoint.
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

    const { symbol, interval, outputsize = 50 } = await req.json();
    if (!symbol || !interval) {
      return new Response("Missing symbol or interval", { status: 400, headers: corsHeaders });
    }

    // Twelve Data expects pairs like "EUR/USD" rather than "EURUSD".
    const formattedSymbol = symbol.length === 6 ? `${symbol.slice(0, 3)}/${symbol.slice(3)}` : symbol;

    const url = `https://api.twelvedata.com/time_series?symbol=${formattedSymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();

    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});