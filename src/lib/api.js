import { supabase } from "./supabaseClient.js";

export async function callEdgeFunction(name, body, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    // Pass signal into Supabase function invocation options
    signal: options.signal,
  });
  if (error) throw error;
  return data;
}

export async function fetchCandles({ symbol, interval, outputsize = 50, signal }) {
  return callEdgeFunction("market-data", { symbol, interval, outputsize }, { signal });
}

export async function fetchDerivCandles({ derivSymbol, granularitySeconds, count = 60, signal }) {
  return callEdgeFunction("deriv-data", { derivSymbol, granularitySeconds, count }, { signal });
}