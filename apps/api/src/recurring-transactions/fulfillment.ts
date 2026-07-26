// apps/api/src/recurring-transactions/fulfillment.ts
// BACKLOG.md US-3.8 (fulfillment) — no dia previsto de cada série ativa, o job
// diário auto-cria a ocorrência *agendada* (isScheduled=true) daquele mês; o
// usuário depois confirma (US-3.7). Idempotente: não duplica se a ocorrência do
// mês já existe. É uma função pura de orquestração — o scheduler (cron/worker)
// só a chama com `asOf = agora`.
import { clampDay, daysInMonth, makeDate, saoPauloYMD } from "@harmon/core";
import type { PrismaClient, Transaction } from "@harmon/db";

export async function fulfillDueRecurrences(
  prisma: PrismaClient,
  asOf: Date,
): Promise<Transaction[]> {
  const { year, month, day } = saoPauloYMD(asOf);
  const monthStart = makeDate(year, month, 1);
  const monthEnd = makeDate(year, month, daysInMonth(year, month));

  const series = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      startDate: { lte: makeDate(year, month, day) },
      OR: [{ endDate: null }, { endDate: { gte: makeDate(year, month, day) } }],
    },
  });

  const created: Transaction[] = [];
  for (const s of series) {
    // Dia previsto clampado ao último dia do mês (§3.4): dia 31 em fevereiro
    // cai no último dia, não "pula" o mês.
    const dueDay = clampDay(year, month, s.dayOfMonth);
    if (dueDay !== day) continue;

    const already = await prisma.transaction.count({
      where: {
        recurringTransactionId: s.id,
        transactionDate: { gte: monthStart, lte: monthEnd },
      },
    });
    if (already > 0) continue;

    const tx = await prisma.transaction.create({
      data: {
        userId: s.userId,
        accountId: s.accountId,
        creditCardId: s.creditCardId,
        categoryId: s.categoryId,
        kind: s.kind,
        source: "manual",
        description: s.description,
        transactionDate: makeDate(year, month, dueDay),
        currency: s.currency,
        amountCents: s.referenceAmountCents,
        amountBRLCents: s.referenceAmountBRLCents,
        isScheduled: true,
        recurringTransactionId: s.id,
      },
    });
    created.push(tx);
  }
  return created;
}
