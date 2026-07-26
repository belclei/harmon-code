// apps/api/src/transactions/serialize.ts
// Resposta de transação — campos que a lista (US-3.9, TransactionRow) e as ações
// (US-3.7) consomem. Sinal do dinheiro vem de kind/transferDirection, nunca do
// valor (§1.4): amountCents/amountBRLCents são sempre positivos.
import type { Transaction } from "@harmon/db";

export interface TransactionResponse {
  id: string;
  kind: Transaction["kind"];
  source: Transaction["source"];
  description: string;
  transactionDate: string;
  accountId: string | null;
  creditCardId: string | null;
  categoryId: string | null;
  currency: string;
  amountCents: number;
  amountBRLCents: number;
  isScheduled: boolean;
  transferPairId: string | null;
  transferDirection: Transaction["transferDirection"];
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentPurchaseAmountCents: number | null;
  recurringTransactionId: string | null;
  createdAt: string;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toTransactionResponse(tx: Transaction): TransactionResponse {
  return {
    id: tx.id,
    kind: tx.kind,
    source: tx.source,
    description: tx.description,
    transactionDate: ymd(tx.transactionDate),
    accountId: tx.accountId,
    creditCardId: tx.creditCardId,
    categoryId: tx.categoryId,
    currency: tx.currency,
    amountCents: tx.amountCents,
    amountBRLCents: tx.amountBRLCents,
    isScheduled: tx.isScheduled,
    transferPairId: tx.transferPairId,
    transferDirection: tx.transferDirection,
    installmentGroupId: tx.installmentGroupId,
    installmentNumber: tx.installmentNumber,
    installmentTotal: tx.installmentTotal,
    installmentPurchaseAmountCents: tx.installmentPurchaseAmountCents,
    recurringTransactionId: tx.recurringTransactionId,
    createdAt: tx.createdAt.toISOString(),
  };
}
