// apps/api/src/recurring-transactions/routes.ts
// BACKLOG.md US-3.9b — gestão das séries de recorrência (§6.7). Criação direta
// (sem depender de uma transação existente), edição/pausa/encerramento/exclusão.
// Nunca cascateia sobre ocorrências passadas: as ocorrências são Transactions
// ligadas por recurringTransactionId — mexer na série não toca nelas.
import { makeDate } from "@harmon/core";
import type { RecurringTransaction } from "@harmon/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import { NOT_FOUND, VALIDATION_FAILED } from "../errors.js";

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD.");

const CreateBody = z
  .object({
    description: z.string().min(1),
    kind: z.enum(["income", "expense"]),
    accountId: z.string().min(1).optional(),
    creditCardId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    referenceAmountCents: z.number().int().positive(),
    dayOfMonth: z.number().int().min(1).max(31),
    isVariableAmount: z.boolean().default(false),
    startDate: IsoDate,
    endDate: IsoDate.nullable().optional(),
  })
  .strict();

const UpdateBody = z
  .object({
    description: z.string().min(1).optional(),
    referenceAmountCents: z.number().int().positive().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    accountId: z.string().min(1).nullable().optional(),
    creditCardId: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    isVariableAmount: z.boolean().optional(),
    isActive: z.boolean().optional(),
    endDate: IsoDate.nullable().optional(),
  })
  .strict();

function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-");
  return makeDate(Number(y), Number(m), Number(d));
}

function serialize(r: RecurringTransaction) {
  return {
    id: r.id,
    description: r.description,
    kind: r.kind,
    accountId: r.accountId,
    creditCardId: r.creditCardId,
    categoryId: r.categoryId,
    referenceAmountCents: r.referenceAmountCents,
    referenceAmountBRLCents: r.referenceAmountBRLCents,
    currency: r.currency,
    dayOfMonth: r.dayOfMonth,
    isVariableAmount: r.isVariableAmount,
    isActive: r.isActive,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
  };
}

export async function registerRecurringTransactionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const { prisma } = fastify;

  fastify.post(
    "/v1/recurring-transactions",
    { schema: { body: CreateBody }, preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler
      const userId = request.userId!;
      const body = request.body as z.infer<typeof CreateBody>;
      const hasAccount = body.accountId != null;
      const hasCard = body.creditCardId != null;
      if (hasAccount === hasCard) {
        throw VALIDATION_FAILED([
          {
            field: "accountId",
            message: "A série pertence a uma conta ou a um cartão.",
          },
        ]);
      }
      const series = await prisma.recurringTransaction.create({
        data: {
          userId,
          description: body.description,
          kind: body.kind,
          accountId: body.accountId ?? null,
          creditCardId: body.creditCardId ?? null,
          categoryId: body.categoryId ?? null,
          referenceAmountCents: body.referenceAmountCents,
          referenceAmountBRLCents: body.referenceAmountCents,
          currency: "BRL",
          dayOfMonth: body.dayOfMonth,
          isVariableAmount: body.isVariableAmount,
          startDate: parseDate(body.startDate),
          endDate: body.endDate ? parseDate(body.endDate) : null,
        },
      });
      return reply.code(201).send(serialize(series));
    },
  );

  fastify.get(
    "/v1/recurring-transactions",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler
      const userId = request.userId!;
      const series = await prisma.recurringTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return series.map(serialize);
    },
  );

  async function findOwned(
    userId: string,
    id: string,
  ): Promise<RecurringTransaction> {
    const series = await prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });
    if (!series) throw NOT_FOUND();
    return series;
  }

  fastify.patch(
    "/v1/recurring-transactions/:id",
    { schema: { body: UpdateBody }, preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof UpdateBody>;
      await findOwned(userId, id);
      const updated = await prisma.recurringTransaction.update({
        where: { id },
        data: {
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.referenceAmountCents !== undefined
            ? {
                referenceAmountCents: body.referenceAmountCents,
                referenceAmountBRLCents: body.referenceAmountCents,
              }
            : {}),
          ...(body.dayOfMonth !== undefined
            ? { dayOfMonth: body.dayOfMonth }
            : {}),
          ...(body.accountId !== undefined
            ? { accountId: body.accountId }
            : {}),
          ...(body.creditCardId !== undefined
            ? { creditCardId: body.creditCardId }
            : {}),
          ...(body.categoryId !== undefined
            ? { categoryId: body.categoryId }
            : {}),
          ...(body.isVariableAmount !== undefined
            ? { isVariableAmount: body.isVariableAmount }
            : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.endDate !== undefined
            ? { endDate: body.endDate ? parseDate(body.endDate) : null }
            : {}),
        },
      });
      return serialize(updated);
    },
  );

  // Exclui a série. Ocorrências passadas (Transactions) ficam — só desliga o
  // vínculo para não deixar FK órfã apontando para uma série inexistente.
  fastify.delete(
    "/v1/recurring-transactions/:id",
    { preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      await findOwned(userId, id);
      await prisma.transaction.updateMany({
        where: { userId, recurringTransactionId: id },
        data: { recurringTransactionId: null },
      });
      await prisma.recurringTransaction.delete({ where: { id } });
      return reply.code(204).send();
    },
  );
}
