// apps/api/src/cards/invoice-events-job.ts
// BACKLOG.md US-6.1 (3rd bullet) — job diário que compara closingDate/dueDate
// de cada cartão ativo contra "hoje" e dispara card.invoice_closed/.invoice_due
// (IMPLEMENTACAO.md §6 catalog), consumidos pela Timeline. Mesmo padrão do job
// de recorrências (recurring-transactions/fulfillment.ts): função pura de
// orquestração, o scheduler (cron/worker) só a chama com `asOf = agora`.
//
// Idempotência: "não recriar o evento se o job rodar duas vezes no mesmo dia"
// (§3.4) — checada via "já existe um DomainEvent deste tipo para este cartão
// criado desde o início do dia de hoje (America/Sao_Paulo)", não via uma
// unique constraint no schema (DomainEvent é append-only genérico, sem uma
// chave natural (cardId, type, period) declarada — adicionar uma exigiria
// migração; a checagem por janela do dia é suficiente para "no máximo uma vez
// por dia" sem tocar o schema).
import {
  closingDate,
  compareDates,
  dueDate,
  faturaPeriodo,
  makeDate,
  saoPauloYMD,
  sumCardTransactionsForInvoiceMonth,
} from "@harmon/core";
import type { PrismaClient, Transaction } from "@harmon/db";
import type { CreditCardLike, TransactionLike } from "@harmon/domain";

function previousYearMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

async function alreadyFiredToday(
  prisma: PrismaClient,
  cardId: string,
  type: string,
  todayStart: Date,
): Promise<boolean> {
  const count = await prisma.domainEvent.count({
    where: {
      aggregateType: "CreditCard",
      aggregateId: cardId,
      type,
      createdAt: { gte: todayStart },
    },
  });
  return count > 0;
}

function toTransactionLike(tx: Transaction): TransactionLike {
  return {
    id: tx.id,
    kind: tx.kind,
    amountBRLCents: tx.amountBRLCents,
    transactionDate: tx.transactionDate,
    isScheduled: tx.isScheduled,
    recurringTransactionId: tx.recurringTransactionId ?? undefined,
  };
}

export interface CloseDueInvoicesResult {
  closedFired: number;
  dueFired: number;
}

export async function closeDueInvoices(
  prisma: PrismaClient,
  asOf: Date,
): Promise<CloseDueInvoicesResult> {
  const { year, month, day } = saoPauloYMD(asOf);
  const today = makeDate(year, month, day);

  const cards = await prisma.creditCard.findMany({
    where: { isActive: true },
  });

  let closedFired = 0;
  let dueFired = 0;

  for (const card of cards) {
    const cardLike: CreditCardLike = {
      id: card.id,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      autoDebitAccountId: card.autoDebitAccountId,
      isActive: card.isActive,
    };
    // Janela de 1 mês corrente + anterior cobre qualquer configuração de
    // closingDay/dueDay — mesmo raciocínio de findClosedNotDueInvoiceMonth.
    const candidates = [previousYearMonth(year, month), { year, month }];
    let transactions: Transaction[] | undefined;
    const loadTransactions = async () => {
      transactions ??= await prisma.transaction.findMany({
        where: { creditCardId: card.id },
      });
      return transactions;
    };

    for (const candidate of candidates) {
      if (
        compareDates(
          closingDate(cardLike, candidate.year, candidate.month),
          today,
        ) === 0 &&
        !(await alreadyFiredToday(
          prisma,
          card.id,
          "card.invoice_closed",
          today,
        ))
      ) {
        const period = faturaPeriodo(cardLike, candidate.year, candidate.month);
        const total = sumCardTransactionsForInvoiceMonth(
          cardLike,
          (await loadTransactions()).map(toTransactionLike),
          candidate.year,
          candidate.month,
        );
        await prisma.domainEvent.create({
          data: {
            userId: card.userId,
            type: "card.invoice_closed",
            aggregateType: "CreditCard",
            aggregateId: card.id,
            payload: {
              periodStart: period.start.toISOString(),
              periodEnd: period.end.toISOString(),
              totalCents: total.valueCents,
            },
          },
        });
        closedFired++;
      }

      if (
        compareDates(
          dueDate(cardLike, candidate.year, candidate.month),
          today,
        ) === 0 &&
        !(await alreadyFiredToday(prisma, card.id, "card.invoice_due", today))
      ) {
        const total = sumCardTransactionsForInvoiceMonth(
          cardLike,
          (await loadTransactions()).map(toTransactionLike),
          candidate.year,
          candidate.month,
        );
        await prisma.domainEvent.create({
          data: {
            userId: card.userId,
            type: "card.invoice_due",
            aggregateType: "CreditCard",
            aggregateId: card.id,
            payload: {
              totalCents: total.valueCents,
              autoDebitAccountId: card.autoDebitAccountId,
            },
          },
        });
        dueFired++;
      }
    }
  }

  return { closedFired, dueFired };
}
