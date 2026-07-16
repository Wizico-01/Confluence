// Supabase Edge Function: analyze-chart-image
//
// Takes a signed URL to a user-uploaded chart screenshot (one timeframe at
// a time) and asks a vision-capable model to read it: visible trend,
// approximate swing structure, any obvious reversal candlestick, and
// visible key levels. This is a cross-check/second-opinion layer that sits
// alongside the live-data cascade — image reads are inherently fuzzier
// than structure computed from real OHLC data, so treat the result as
// supporting context, not a replacement for the cascade's confluence score.
//
// Deploy:  supabase functions deploy analyze-chart-image
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a technical chart-reading assistant. You will be shown a
screenshot of a forex or gold chart for one timeframe. Respond ONLY with JSON matching
this exact shape, nothing else:

{
  "trend": "uptrend" | "downtrend" | "range",
  "structure_notes": "one short sentence on HH/HL, LH/LL, or range behavior you can see",
  "visible_pattern": "name of a reversal candlestick pattern if one is clearly visible on the
     most recent candles, otherwise null",
  "key_levels_notes": "one short sentence on any obvious support/resistance or round-number
     level visible on the chart, otherwise null",
  "summary": "one short plain-English sentence combining the above for a trader glancing at
     a dashboard"
}

Be conservative — if something isn't clearly visible, say so rather than guessing.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error } = await supabaseAuth.auth.getUser();
    if (error || !userData?.user) return new Response("Unauthorized", { status: 401 });

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("subscription_status")
      .eq("id", userData.user.id)
      .single();
    if (profile?.subscription_status !== "active") {
      return new Response(JSON.stringify({ error: "Subscription required" }), { status: 402 });
    }

    const { imageUrl, symbol, timeframe } = await req.json();
    if (!imageUrl) return new Response("Missing imageUrl", { status: 400 });

    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const mediaType = imageRes.headers.get("content-type") || "image/jpeg";

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
              { type: "text", text: `Symbol: ${symbol}. Timeframe: ${timeframe}. Read this chart.` },
            ],
          },
        ],
      }),
    });

    const aiJson = await aiRes.json();
    const textBlock = aiJson.content?.find((c: any) => c.type === "text");
    if (!textBlock) return new Response(JSON.stringify({ error: "No response from model" }), { status: 502 });

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text.replace(/```json|```/g, "").trim());
    } catch {
      return new Response(JSON.stringify({ error: "Could not parse model response" }), { status: 502 });
    }

    return new Response(JSON.stringify(parsed), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
