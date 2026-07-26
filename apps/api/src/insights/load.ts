import type {
  Account as PrismaAccount,
  CreditCard as PrismaCard,
  PrismaClient,
  RecurringFulfillment as PrismaFulfillment,
  RecurringTransaction as PrismaRecurring,
  Transaction as PrismaTransaction,
} from "@harmon/db";
// apps/api/src/insights/load.ts
// Carrega o dataset financeiro de um usuário e o mapeia dos modelos Prisma
// para os contratos *Like de @harmon/domain — a forma pura que packages/core
// consome (§3). Nenhuma matemática de dinheiro aqui: só I/O + mapeamento.
import type {
  AccountLike,
  CreditCardLike,
  RecurringFulfillmentLike,
  RecurringTransactionLike,
  TransactionLike,
} from "@harmon/domain";

export interface InsightsDataset {
  accounts: Array<{ account: AccountLike; transactions: TransactionLike[] }>;
  cards: Array<{ card: CreditCardLike; transactions: TransactionLike[] }>;
  scheduledTransactions: TransactionLike[];
  recurringTransactions: RecurringTransactionLike[];
  fulfillments: RecurringFulfillmentLike[];
}

function toAccountLike(a: PrismaAccount): AccountLike {
  return {
    id: a.id,
    type: a.type,
    openingBalanceCents: a.openingBalanceCents,
    overdraftLimitCents: a.overdraftLimitCents,
    isActive: a.isActive,
  };
}

function toCardLike(c: PrismaCard): CreditCardLike {
  return {
    id: c.id,
    closingDay: c.closingDay,
    dueDay: c.dueDay,
    autoDebitAccountId: c.autoDebitAccountId,
    isActive: c.isActive,
  };
}

function toTransactionLike(t: PrismaTransaction): TransactionLike {
  return {
    id: t.id,
    kind: t.kind,
    transferDirection: t.transferDirection ?? undefined,
    amountBRLCents: t.amountBRLCents,
    transactionDate: t.transactionDate,
    isScheduled: t.isScheduled,
    recurringTransactionId: t.recurringTransactionId ?? undefined,
  };
}

function toRecurringLike(r: PrismaRecurring): RecurringTransactionLike {
  return {
    id: r.id,
    // transfer não recorre (§1.5) — o schema permite TxKind, mas a série é
    // sempre income|expense na prática.
    kind: r.kind as "income" | "expense",
    dayOfMonth: r.dayOfMonth,
    referenceAmountBRLCents: r.referenceAmountBRLCents,
    isVariableAmount: r.isVariableAmount,
    isActive: r.isActive,
    startDate: r.startDate,
    endDate: r.endDate,
  };
}

function toFulfillmentLike(f: PrismaFulfillment): RecurringFulfillmentLike {
  return {
    recurringTransactionId: f.recurringTransactionId,
    year: f.year,
    month: f.month,
  };
}

/** Carrega tudo o que os três cards precisam, em poucas queries. */
export async function loadInsightsDataset(
  prisma: PrismaClient,
  userId: string,
): Promise<InsightsDataset> {
  const [accounts, cards, transactions, recurrings] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.creditCard.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId } }),
    prisma.recurringTransaction.findMany({ where: { userId } }),
  ]);

  // RecurringFulfillment não tem userId — chega pela série do usuário.
  const fulfillments = recurrings.length
    ? await prisma.recurringFulfillment.findMany({
        where: { recurringTransactionId: { in: recurrings.map((r) => r.id) } },
      })
    : [];

  const txByAccount = new Map<string, TransactionLike[]>();
  const txByCard = new Map<string, TransactionLike[]>();
  const scheduledTransactions: TransactionLike[] = [];

  for (const t of transactions) {
    const like = toTransactionLike(t);
    if (t.accountId) {
      const list = txByAccount.get(t.accountId) ?? [];
      list.push(like);
      txByAccount.set(t.accountId, list);
    }
    if (t.creditCardId) {
      const list = txByCard.get(t.creditCardId) ?? [];
      list.push(like);
      txByCard.set(t.creditCardId, list);
    }
    if (t.isScheduled) scheduledTransactions.push(like);
  }

  return {
    accounts: accounts.map((a) => ({
      account: toAccountLike(a),
      transactions: txByAccount.get(a.id) ?? [],
    })),
    cards: cards.map((c) => ({
      card: toCardLike(c),
      transactions: txByCard.get(c.id) ?? [],
    })),
    scheduledTransactions,
    recurringTransactions: recurrings.map(toRecurringLike),
    fulfillments: fulfillments.map(toFulfillmentLike),
  };
}
