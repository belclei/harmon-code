// apps/api/src/timeline/aggregate.ts
// BACKLOG.md US-6.1 — Transaction + DomainEvent interleaved, agregado por dia
// (ARQUITETURA.md §6.12). Função pura: I/O (filtros, fetch) fica em routes.ts;
// aqui só agrupamento + paginação por cursor, testável sem banco.
import type { DomainEvent, Transaction } from "@harmon/db";
import {
  type InstallmentDetail,
  toTransactionResponse,
} from "../transactions/serialize.js";

export type { InstallmentDetail };

export interface TimelineEventItem {
  itemType: "event";
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface TimelineTransactionItem {
  itemType: "transaction";
  transaction: ReturnType<typeof toTransactionResponse>;
}

export type TimelineItem = TimelineEventItem | TimelineTransactionItem;

export interface TimelineDayWithoutBalance {
  date: string;
  items: TimelineItem[];
}

export interface TimelineDay extends TimelineDayWithoutBalance {
  balanceCents: number;
}

export interface TimelinePage {
  days: TimelineDay[];
  nextCursor: string | null;
}

export interface TimelinePageWithoutBalance {
  days: TimelineDayWithoutBalance[];
  nextCursor: string | null;
}

// Datas-calendário puras (transactionDate, @db.Date) já são meia-noite UTC —
// ler com getters UTC direto (mesmo padrão de transactions/serialize.ts's
// `ymd`). Eventos carregam um instante real (createdAt) — dia calendário é
// América/Sao_Paulo (§0 do projeto: "fuso America/Sao_Paulo para lógica de
// data"), lido via Intl com timeZone fixo (mesmo padrão de @harmon/core's
// saoPauloYMD, reimplementado aqui só para não puxar @harmon/core por uma
// formatação de data que não é matemática de dinheiro).
const SAO_PAULO_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function transactionDay(tx: Transaction): string {
  return tx.transactionDate.toISOString().slice(0, 10);
}

function eventDay(event: DomainEvent): string {
  return SAO_PAULO_DAY.format(event.createdAt);
}

interface SortableItem {
  date: string;
  timestamp: number;
  item: TimelineItem;
}

export function buildTimelinePage(
  transactions: Transaction[],
  events: DomainEvent[],
  opts: { cursor?: string; limit: number },
): TimelinePageWithoutBalance {
  const installmentsByGroupId = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.installmentGroupId) {
      if (!installmentsByGroupId.has(tx.installmentGroupId)) {
        installmentsByGroupId.set(tx.installmentGroupId, []);
      }
      const list = installmentsByGroupId.get(tx.installmentGroupId);
      if (list) list.push(tx);
    }
  }

  const sortable: SortableItem[] = [
    ...transactions.map((tx) => ({
      date: transactionDay(tx),
      timestamp: tx.transactionDate.getTime(),
      item: {
        itemType: "transaction" as const,
        transaction: toTransactionResponse(tx, installmentsByGroupId),
      },
    })),
    ...events.map((event) => ({
      date: eventDay(event),
      timestamp: event.createdAt.getTime(),
      item: {
        itemType: "event" as const,
        id: event.id,
        type: event.type,
        payload: event.payload,
        createdAt: event.createdAt.toISOString(),
      },
    })),
  ];

  // Mais recente primeiro — a Timeline é um feed, não uma lista cronológica
  // ascendente; "carregar mais" (cursor) busca dias mais antigos.
  sortable.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.timestamp - a.timestamp;
  });

  const byDay = new Map<string, TimelineItem[]>();
  for (const entry of sortable) {
    if (opts.cursor && entry.date >= opts.cursor) continue;
    const list = byDay.get(entry.date) ?? [];
    list.push(entry.item);
    byDay.set(entry.date, list);
  }

  const allDates = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1));
  const pageDates = allDates.slice(0, opts.limit);
  const hasMore = allDates.length > opts.limit;

  return {
    days: pageDates.map((date) => ({
      date,
      // biome-ignore lint/style/noNonNullAssertion: date comes from byDay's own keys
      items: byDay.get(date)!,
    })),
    nextCursor: hasMore ? (pageDates.at(-1) ?? null) : null,
  };
}
