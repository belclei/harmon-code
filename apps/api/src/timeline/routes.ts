// apps/api/src/timeline/routes.ts
// BACKLOG.md US-6.1 — GET /v1/timeline: Transaction+DomainEvent interleaved,
// agregado por dia, paginado por cursor, filtrável por período/conta-cartão
// (multi-select)/tipo de evento/categoria (ARQUITETURA.md §6.12).
//
// A TimelineAlertBanner (§6.12/§6.4) e o total do painel lateral não têm rota
// própria aqui — ambos derivam de GET /v1/accounts e GET /v1/cards, que já
// expõem isOverLimit/balanceCents/usedCents; duplicar esse cálculo numa rota
// nova seria uma segunda fonte de verdade para o mesmo número (§0).
import type { Prisma } from "@harmon/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import { buildTimelinePage } from "./aggregate.js";

const TimelineQuery = z.object({
  cursor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "cursor no formato AAAA-MM-DD.")
    .optional(),
  limit: z.coerce.number().int().min(1).max(90).default(20),
  accountIds: z.string().optional(),
  cardIds: z.string().optional(),
  types: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from no formato AAAA-MM-DD.")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to no formato AAAA-MM-DD.")
    .optional(),
});

function splitCsv(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export async function registerTimelineRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/timeline",
    {
      schema: { querystring: TimelineQuery },
      preHandler: requireUser(fastify),
    },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const query = request.query as z.infer<typeof TimelineQuery>;

      const accountIds = splitCsv(query.accountIds);
      const cardIds = splitCsv(query.cardIds);
      const types = splitCsv(query.types);
      const fromDate = query.from
        ? new Date(`${query.from}T00:00:00.000Z`)
        : undefined;
      const toDate = query.to
        ? new Date(`${query.to}T23:59:59.999Z`)
        : undefined;

      // Filtro de conta/cartão é um chip multi-select unificado (§6.12): se o
      // usuário selecionou qualquer conta/cartão, só essas instituições
      // aparecem — accountIds/cardIds juntos formam o conjunto visível.
      const entityFilter: Prisma.TransactionWhereInput[] = [];
      if (accountIds) entityFilter.push({ accountId: { in: accountIds } });
      if (cardIds) entityFilter.push({ creditCardId: { in: cardIds } });

      const txWhere: Prisma.TransactionWhereInput = {
        userId,
        ...(entityFilter.length > 0 ? { OR: entityFilter } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(fromDate || toDate
          ? {
              transactionDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      };

      const eventEntityFilter: Prisma.DomainEventWhereInput[] = [];
      if (accountIds) {
        eventEntityFilter.push({
          aggregateType: "Account",
          aggregateId: { in: accountIds },
        });
      }
      if (cardIds) {
        eventEntityFilter.push({
          aggregateType: "CreditCard",
          aggregateId: { in: cardIds },
        });
      }

      const eventWhere: Prisma.DomainEventWhereInput = {
        userId,
        ...(eventEntityFilter.length > 0 ? { OR: eventEntityFilter } : {}),
        ...(types ? { type: { in: types } } : {}),
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      };

      // Transações só desaparecem se o usuário filtrou por tipo de evento e
      // "transaction" (pseudo-tipo) não está entre os selecionados.
      const includeTransactions = !types || types.includes("transaction");

      const [transactions, events] = await Promise.all([
        includeTransactions
          ? fastify.prisma.transaction.findMany({ where: txWhere })
          : Promise.resolve([]),
        // categoryId não filtra events — DomainEvent não tem esse conceito
        // (§6 catalog); o filtro de categoria só restringe transações.
        fastify.prisma.domainEvent.findMany({ where: eventWhere }),
      ]);

      return buildTimelinePage(transactions, events, {
        cursor: query.cursor,
        limit: query.limit,
      });
    },
  );
}
