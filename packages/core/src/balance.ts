// IMPLEMENTACAO.md §2.1 — Saldo: derivado com snapshot conciliado.
// balance(account, asOf) = openingBalanceCents + Σ delta(tx) para toda tx
// confirmada (isScheduled=false) com transactionDate ≤ asOf.

import type {
  AccountLike,
  BreakdownLine,
  Money,
  TransactionLike,
} from "@lurem/domain";
import { compareDates, todayAsDate } from "./dates.js";

export interface BalanceParams {
  account: AccountLike;
  /** Transações já escopadas a esta conta (ambas as pernas de transfer incluídas quando aplicável). */
  transactions: TransactionLike[];
  asOf: Date;
}

function delta(tx: TransactionLike): number {
  switch (tx.kind) {
    case "income":
      return tx.amountBRLCents;
    case "expense":
      return -tx.amountBRLCents;
    case "transfer":
      return tx.transferDirection === "out"
        ? -tx.amountBRLCents
        : tx.amountBRLCents;
  }
}

export function balance({ account, transactions, asOf }: BalanceParams): Money {
  const today = todayAsDate(asOf);

  const confirmed = transactions.filter(
    (tx) => !tx.isScheduled && compareDates(tx.transactionDate, today) <= 0,
  );

  const breakdown: BreakdownLine[] = [
    {
      label: "opening_balance",
      valueCents: account.openingBalanceCents,
      kind: "account_balance",
      sourceRef: { type: "Account", id: account.id },
      isEstimate: false,
    },
    ...confirmed.map(
      (tx): BreakdownLine => ({
        label: "transaction",
        valueCents: delta(tx),
        kind: "account_balance",
        sourceRef: { type: "Transaction", id: tx.id },
        isEstimate: false,
      }),
    ),
  ];

  const valueCents = breakdown.reduce((sum, line) => sum + line.valueCents, 0);

  // §2.3: isOverLimit(account) = balance < −overdraftLimitCents — estado derivado,
  // nunca persistido. A linha abaixo é puramente informativa (valueCents=0):
  // não pode alterar o total (§3.0), só sinaliza para a UI (badge de alerta).
  if (valueCents < -account.overdraftLimitCents) {
    breakdown.push({
      label: "overdraft_note",
      valueCents: 0,
      kind: "overdraft_note",
      sourceRef: { type: "Account", id: account.id },
      isEstimate: false,
    });
  }

  return { valueCents, breakdown };
}
