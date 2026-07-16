import { supabase } from "./supabaseClient.js";

export async function callEdgeFunction(name, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) throw error;
  return data;
}

export async function fetchCandles({ symbol, interval, outputsize = 50 }) {
  return callEdgeFunction("market-data", { symbol, interval, outputsize });
}

// Live candles for Deriv synthetic indices (Volatility 75/100, Boom/Crash,
// etc.) — the primary data source for those symbols, since they're not
// available from Twelve Data or any standard forex/stock provider.
export async function fetchDerivCandles({ derivSymbol, granularitySeconds, count = 60 }) {
  return callEdgeFunction("deriv-data", { derivSymbol, granularitySeconds, count });
}
