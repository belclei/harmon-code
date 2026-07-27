// apps/web/src/lib/money.ts
// Shared by every create/edit form that collects a reais amount from a text
// field (TransactionsPage, AccountsPage, TimelinePage's wallet activation
// card) — money math itself stays backend-only (§0), this is just the
// text-input parsing step before a value ever reaches the API.

/** "1.200,00" / "1200.00" → 120000 centavos. null if not a valid number > 0 — for fields where zero/blank isn't a legitimate value (a transaction's amount, a card's limit). */
export function reaisToCentsPositive(input: string): number | null {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/** Same parsing, but blank/zero is legitimate (an opening balance or overdraft limit can genuinely be R$ 0) — blank input resolves to 0 rather than an error. */
export function reaisToCentsOrZero(input: string): number | null {
  if (!input.trim()) return 0;
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
