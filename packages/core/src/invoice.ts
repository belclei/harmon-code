// IMPLEMENTACAO.md §3.4 — Fechamento e vencimento de fatura.
//
// ⚠ Nota de decisão (ver relatório final): a fórmula do documento usa "ainda
// não pagas" para as transações da fatura, mas o schema normativo (§1.4) não
// tem nenhum campo/relacionamento que marque uma transação de cartão como
// paga — ARQUITETURA.md §6.4 confirma isso explicitamente ("não existe hoje
// um vínculo entre a transferência de pagamento e a fatura"). Por isso, esta
// função soma TODAS as transações do cartão dentro do período de fatura
// fechada-e-não-vencida; "fatura já paga" (§3.7) é coberto apenas no sentido
// de "o vencimento já passou" (fora da janela closingDate..dueDate), não no
// sentido de um pagamento explícito registrado — não há dado para isso hoje.
//
// kind='transfer' é excluído da soma (§3.1: transfer nunca conta como receita
// nem despesa em nenhum agregado). kind='income' (ex.: estorno/refund) reduz
// o valor da fatura, simetricamente a expense aumentando — trata a fatura
// como um mini-balanço a partir de zero (sem "saldo inicial").

import type {
  BreakdownLine,
  CreditCardLike,
  Money,
  TransactionLike,
} from "@harmon/domain";
import {
  closingDate,
  compareDates,
  dueDate,
  faturaPeriodo,
  todayAsDate,
} from "./dates.js";

export interface FaturaFechadaNaoVencidaParams {
  card: CreditCardLike;
  /** Transações já escopadas a este cartão. */
  transactions: TransactionLike[];
  asOf: Date;
}

function isWithinPeriod(
  date: Date,
  period: { start: Date; end: Date },
): boolean {
  // (start, end] — semiaberto: start excluído, end incluído.
  return (
    compareDates(date, period.start) > 0 && compareDates(date, period.end) <= 0
  );
}

function todayYearMonth(today: Date): { year: number; month: number } {
  return { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };
}

export function previousYearMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

/**
 * kind='transfer' nunca chega aqui — já é filtrado antes (§3.1: transfer
 * nunca conta como receita/despesa). O type guard abaixo torna essa garantia
 * explícita no tipo, em vez de um branch `default: return 0` inalcançável
 * (o que deixaria cobertura de branch/statement estruturalmente impossível
 * de atingir 100% — §3 exige 100%, não "100% do alcançável").
 */
function isIncomeOrExpense(
  tx: TransactionLike,
): tx is TransactionLike & { kind: "income" | "expense" } {
  return tx.kind === "income" || tx.kind === "expense";
}

function delta(tx: TransactionLike & { kind: "income" | "expense" }): number {
  return tx.kind === "expense" ? tx.amountBRLCents : -tx.amountBRLCents;
}

/** Soma as transações do cartão dentro do período de fatura (year, month), sem nenhum outro filtro de data. */
export function sumCardTransactionsForInvoiceMonth(
  card: CreditCardLike,
  transactions: TransactionLike[],
  year: number,
  month: number,
): Money {
  const period = faturaPeriodo(card, year, month);
  const inPeriod = transactions
    .filter((tx) => isWithinPeriod(tx.transactionDate, period))
    .filter(isIncomeOrExpense);

  const breakdown: BreakdownLine[] = inPeriod.map((tx) => ({
    label: "closed_invoice_transaction",
    valueCents: delta(tx),
    kind: "closed_invoice",
    sourceRef: { type: "Transaction", id: tx.id },
    isEstimate: false,
  }));

  const valueCents = breakdown.reduce((sum, line) => sum + line.valueCents, 0);
  return { valueCents, breakdown };
}

/** Encontra o mês de fatura M tal que closingDate(card,M) ≤ hoje < dueDate(card,M), se existir. */
export function findClosedNotDueInvoiceMonth(
  card: CreditCardLike,
  today: Date,
): { year: number; month: number } | undefined {
  const { year, month } = todayYearMonth(today);
  // A janela closing..due tem no máximo ~1 mês; checar o mês corrente e o anterior
  // cobre qualquer configuração de closingDay/dueDay.
  const candidates = [{ year, month }, previousYearMonth(year, month)];
  for (const candidate of candidates) {
    const closing = closingDate(card, candidate.year, candidate.month);
    const due = dueDate(card, candidate.year, candidate.month);
    if (compareDates(closing, today) <= 0 && compareDates(today, due) < 0) {
      return candidate;
    }
  }
  return undefined;
}

/** closingDate/dueDate re-exportados para uso por outras funções do core (ex.: fluxoDeCaixaFuturo). */
export { closingDate, dueDate };

export function faturaFechadaNaoVencida({
  card,
  transactions,
  asOf,
}: FaturaFechadaNaoVencidaParams): Money {
  const today = todayAsDate(asOf);
  const invoiceMonth = findClosedNotDueInvoiceMonth(card, today);

  if (!invoiceMonth) {
    return { valueCents: 0, breakdown: [] };
  }

  return sumCardTransactionsForInvoiceMonth(
    card,
    transactions,
    invoiceMonth.year,
    invoiceMonth.month,
  );
}
