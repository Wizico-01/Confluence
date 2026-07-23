import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PricingCard from "../components/PricingCard.jsx";
import { startSubscriptionCheckout } from "../lib/paystack.js";
import { callEdgeFunction } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// Replace priceNaira / planCode with your real Paystack Plan codes
// (created in the Paystack dashboard under Plans) once you're live.
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "One trading style, core alerts.",
    priceNaira: 100,
    planCode: "PLN_be7i1bbnux52pap",
    features: ["1 trading style (swing, day, or scalp)", "Up to 3 symbols", "Confluence alerts", "Risk & lot size calculator"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Full cascade access, all styles.",
    priceNaira: 35000,
    planCode: "PLN_hofp2dt3rbkn9bs",
    features: ["All 3 trading styles", "Unlimited symbols", "Confluence alerts + alert log", "Priority data refresh"],
    highlight: true,
  },
];

export default function Pricing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [verifyError, setVerifyError] = useState("");

  async function handleSelect(plan) {
    if (!user) return navigate("/signup");
    setVerifyError("");
    setLoadingPlan(plan.id);
    try {
      await startSubscriptionCheckout({
        email: user.email,
        planCode: plan.planCode,
        amountKobo: plan.priceNaira * 100,
        onSuccess: async (response) => {
          try {
            setLoadingPlan(plan.id);
            await callEdgeFunction("paystack-verify", { reference: response.reference, planId: plan.id });
            navigate("/dashboard");
          } catch (err) {
            console.error("Verification failed:", err);
            setVerifyError(
              "Payment went through, but we couldn't verify it automatically. Check that the paystack-verify function is deployed and PAYSTACK_SECRET_KEY is set, then contact support with your payment reference: " + response.reference
            );
            setLoadingPlan(null);
          }
        },
        onClose: () => setLoadingPlan(null),
      });
    } catch (err) {
      console.error(err);
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      <div className="text-center max-w-lg mx-auto">
        <span className="text-xs font-bold uppercase tracking-wide text-royal">Pricing</span>
        <h1 className="font-display text-3xl font-bold text-ink mt-2">Simple monthly billing, cancel anytime.</h1>
        <p className="text-ink/60 mt-3">Billed monthly in Naira via Paystack. {profile?.subscription_status === "active" ? "You're currently subscribed." : ""}</p>
      </div>
      {verifyError && (
        <div className="max-w-lg mx-auto mt-6 rounded-xl border border-bear/30 bg-bear/5 px-4 py-3">
          <p className="text-sm text-bear font-medium">{verifyError}</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-6 mt-12">
        {PLANS.map((plan) => (
          <PricingCard key={plan.id} plan={plan} onSelect={handleSelect} loading={loadingPlan === plan.id} />
        ))}
      </div>
      <p className="text-xs text-ink/40 text-center mt-8">
        Prices and plan codes shown are placeholders — set your real amounts and Paystack Plan codes before going live.
      </p>
    </div>
  );
}
