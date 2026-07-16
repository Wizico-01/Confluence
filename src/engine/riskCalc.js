// Position sizing. Pip value per standard lot is an approximation —
// exact value depends on the pair and account currency, so this is
// clearly labelled as an estimate in the UI.
export function calcLotSize(accountSize, riskPercent, stopLossPips, symbol) {
  const pipValuePerStandardLot = symbol.includes("JPY") ? 6.8 : 10;
  const riskAmount = accountSize * (riskPercent / 100);
  if (!stopLossPips || stopLossPips <= 0) return null;
  const lots = riskAmount / (stopLossPips * pipValuePerStandardLot);
  return { riskAmount, lots: Math.max(0.01, +lots.toFixed(2)) };
}
