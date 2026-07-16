// Supabase Edge Function: paystack-webhook
//
// Point your Paystack dashboard webhook URL at this function's deployed
// URL. Handles the ongoing lifecycle events Inline checkout alone can't
// tell you about — renewals, failed charges, and cancellations — so a
// subscription doesn't stay "active" after it should have lapsed.
//
// Deploy:  supabase functions deploy paystack-webhook --no-verify-jwt
// Secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmacSha512Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const rawBody = await req.text();

  // Verify the request genuinely came from Paystack before touching anything.
  const signature = req.headers.get("x-paystack-signature");
  const expected = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);
  if (signature !== expected) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(rawBody);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  switch (event.event) {
    case "subscription.create":
    case "charge.success": {
      const email = event.data?.customer?.email;
      if (email) {
        const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
        if (profile) {
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          await admin.from("profiles").update({
            subscription_status: "active",
            current_period_end: periodEnd.toISOString(),
          }).eq("id", profile.id);
        }
      }
      break;
    }
    case "subscription.disable":
    case "subscription.not_renew":
    case "invoice.payment_failed": {
      const email = event.data?.customer?.email;
      if (email) {
        const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
        if (profile) {
          await admin.from("profiles").update({ subscription_status: "cancelled" }).eq("id", profile.id);
        }
      }
      break;
    }
    default:
      break; // ignore events we don't act on
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
