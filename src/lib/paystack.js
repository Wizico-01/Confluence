// Client-side Paystack Inline checkout helper.
// The public key only ever authorises opening the payment popup — the
// actual transaction is verified server-side in the paystack-verify
// Supabase Edge Function using your SECRET key, which never touches the browser.

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export async function startSubscriptionCheckout({ email, planCode, amountKobo, onSuccess, onClose }) {
  await loadPaystackScript();
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: amountKobo,
    plan: planCode,
    currency: "NGN",
    callback: (response) => onSuccess?.(response),
    onClose: () => onClose?.(),
  });
  handler.openIframe();
}
