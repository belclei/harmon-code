// IMPLEMENTACAO.md §3.0 — Contrato de decomposição.
// Toda função do core devolve { valueCents, breakdown }. INVARIANTE testável:
// money.valueCents === Σ breakdown[i].valueCents (property-based test em packages/core).

export type BreakdownLineKind =
  | "account_balance"
  | "closed_invoice"
  | "scheduled_tx"
  | "recurring_expense"
  | "recurring_income"
  | "overdraft_note";

export interface SourceRef {
  type: string;
  id: string;
}

export interface BreakdownLine {
  /** Rótulo estável (a UI traduz/estiliza) — não é a string pt-BR final. */
  label: string;
  /** Com sinal: contribuição desta linha ao total. */
  valueCents: number;
  kind: BreakdownLineKind;
  /** Link para a origem (§6.9 "de onde vem?"). */
  sourceRef?: SourceRef;
  /** Dispara o estilo tracejado/cor de estimativa na UI (§4.3). */
  isEstimate: boolean;
}

export interface Money {
  valueCents: number;
  breakdown: BreakdownLine[];
}
