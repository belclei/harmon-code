// apps/api/src/portador/routes.ts
// BACKLOG.md US-6.3 — atribuição de transações a um conectado (portador) e
// acerto entre contas conectadas (ARQUITETURA.md §6.10).
//
// Escopo: o fluxo canônico do §6.8 é "durante a revisão de fatura importada,
// atribua a transação reconhecida a um conectado" — mas o pipeline de
// importação é o Épico 5, explicitamente fora deste ciclo de trabalho. As
// ações abaixo (assign/accept/reject/settle) operam sobre qualquer
// Transaction existente (manual ou, no futuro, importada) — a rota de
// atribuição não depende de a transação ter vindo de um documento.
//
// Modelo de estado: o schema (§1.4) tem `portadorUserId` + `portadorSettled`
// — não um enum assigned/accepted/rejected. Por isso:
// - assign: seta portadorUserId na transação do dono.
// - accept: cria uma transação espelho nas contas do assignee (com
//   portadorUserId apontando de volta ao dono original) — a original NÃO é
//   alterada, ela already carrega o vínculo.
// - reject: limpa portadorUserId da original (some da lista de pendentes).
// - settle: soma o saldo líquido entre os dois (mesma fórmula de
//   connections/routes.ts) e registra uma transação real na conta do
//   usuário que está acertando — nenhuma tentativa de sincronizar as duas
//   pontas automaticamente, já que Lurem não vê a transferência bancária
//   real entre contas de pessoas diferentes.
//
// `portadorMirrorOfTransactionId` (emenda 27/07/2026, IMPLEMENTACAO.md §1.4)
// liga o espelho de volta à original — sem isso, encontrado em validação de
// navegador, GET /v1/portador/pending nunca esvaziava depois de aceito (a
// original mantém portadorUserId indefinidamente por design). "Pendente"
// agora exclui originais que já têm um espelho apontando pra elas.
import type { Prisma } from "@lurem/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import {
  CONNECTION_NOT_ACCEPTED,
  NOT_FOUND,
  PORTADOR_ALREADY_ACCEPTED,
  VALIDATION_FAILED,
} from "../errors.js";

const AssignBody = z
  .object({
    transactionId: z.string().min(1),
    portadorUserId: z.string().min(1),
  })
  .strict();

const AcceptBody = z
  .object({
    accountId: z.string().min(1).optional(),
    creditCardId: z.string().min(1).optional(),
  })
  .strict();

const SettleBody = z
  .object({
    counterpartUserId: z.string().min(1),
    accountId: z.string().min(1).optional(),
    creditCardId: z.string().min(1).optional(),
  })
  .strict();

async function fireEvent(
  fastify: FastifyInstance,
  userId: string,
  type: string,
  aggregateId: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  await fastify.prisma.domainEvent.create({
    data: { userId, type, aggregateType: "Transaction", aggregateId, payload },
  });
}

async function requireAcceptedConnection(
  fastify: FastifyInstance,
  a: string,
  b: string,
): Promise<void> {
  const connection = await fastify.prisma.userConnection.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterUserId: a, addresseeUserId: b },
        { requesterUserId: b, addresseeUserId: a },
      ],
    },
  });
  if (!connection) throw CONNECTION_NOT_ACCEPTED();
}

export async function registerPortadorRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/portador/pending",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const candidates = await fastify.prisma.transaction.findMany({
        where: { portadorUserId: userId, portadorSettled: false },
        orderBy: { transactionDate: "desc" },
      });
      // Já aceita (tem espelho apontando pra ela) → não é mais pendente,
      // mesmo com portadorUserId ainda setado na original (§1.4 emenda).
      const mirrored = await fastify.prisma.transaction.findMany({
        where: {
          portadorMirrorOfTransactionId: { in: candidates.map((t) => t.id) },
        },
        select: { portadorMirrorOfTransactionId: true },
      });
      const acceptedIds = new Set(
        mirrored.map((m) => m.portadorMirrorOfTransactionId),
      );
      const transactions = candidates.filter((t) => !acceptedIds.has(t.id));
      const ownerIds = [...new Set(transactions.map((t) => t.userId))];
      const owners = await fastify.prisma.user.findMany({
        where: { id: { in: ownerIds } },
      });
      const ownerById = new Map(owners.map((u) => [u.id, u]));
      return transactions.map((t) => ({
        id: t.id,
        description: t.description,
        transactionDate: t.transactionDate.toISOString().slice(0, 10),
        kind: t.kind,
        amountCents: t.amountCents,
        amountBRLCents: t.amountBRLCents,
        currency: t.currency,
        ownerUserId: t.userId,
        ownerName: ownerById.get(t.userId)?.name ?? "",
      }));
    },
  );

  fastify.post(
    "/v1/portador/assign",
    { schema: { body: AssignBody }, preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof AssignBody>;

      const transaction = await fastify.prisma.transaction.findFirst({
        where: { id: body.transactionId, userId },
      });
      if (!transaction) throw NOT_FOUND();

      await requireAcceptedConnection(fastify, userId, body.portadorUserId);

      const updated = await fastify.prisma.transaction.update({
        where: { id: transaction.id },
        data: { portadorUserId: body.portadorUserId },
      });
      await fireEvent(fastify, userId, "portador.assigned", updated.id, {
        counterpartUserId: body.portadorUserId,
      });
      await fireEvent(
        fastify,
        body.portadorUserId,
        "portador.assigned",
        updated.id,
        { counterpartUserId: userId },
      );
      return { id: updated.id, portadorUserId: updated.portadorUserId };
    },
  );

  fastify.post(
    "/v1/portador/:txId/accept",
    { schema: { body: AcceptBody }, preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { txId } = request.params as { txId: string };
      const body = request.body as z.infer<typeof AcceptBody>;

      const original = await fastify.prisma.transaction.findUnique({
        where: { id: txId },
      });
      if (!original || original.portadorUserId !== userId) {
        throw NOT_FOUND();
      }
      const existingMirror = await fastify.prisma.transaction.findFirst({
        where: { portadorMirrorOfTransactionId: original.id },
      });
      if (existingMirror) {
        throw PORTADOR_ALREADY_ACCEPTED();
      }
      if (!body.accountId === !body.creditCardId) {
        throw VALIDATION_FAILED([
          {
            field: "accountId",
            message: "Escolha a conta OU o cartão de destino (nunca os dois).",
          },
        ]);
      }
      if (body.accountId) {
        const account = await fastify.prisma.account.findFirst({
          where: { id: body.accountId, userId },
        });
        if (!account) throw NOT_FOUND();
      }
      if (body.creditCardId) {
        const card = await fastify.prisma.creditCard.findFirst({
          where: { id: body.creditCardId, userId },
        });
        if (!card) throw NOT_FOUND();
      }

      const mirror = await fastify.prisma.transaction.create({
        data: {
          userId,
          accountId: body.accountId,
          creditCardId: body.creditCardId,
          kind: original.kind,
          source: "manual",
          description: original.description,
          transactionDate: original.transactionDate,
          currency: original.currency,
          amountCents: original.amountCents,
          amountBRLCents: original.amountBRLCents,
          portadorUserId: original.userId,
          portadorMirrorOfTransactionId: original.id,
        },
      });
      await fireEvent(fastify, userId, "portador.accepted", original.id, {
        counterpartUserId: original.userId,
      });
      await fireEvent(
        fastify,
        original.userId,
        "portador.accepted",
        original.id,
        {
          counterpartUserId: userId,
        },
      );

      reply.code(201);
      return { id: mirror.id };
    },
  );

  fastify.post(
    "/v1/portador/:txId/reject",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { txId } = request.params as { txId: string };

      const original = await fastify.prisma.transaction.findUnique({
        where: { id: txId },
      });
      if (!original || original.portadorUserId !== userId) {
        throw NOT_FOUND();
      }

      await fastify.prisma.transaction.update({
        where: { id: original.id },
        data: { portadorUserId: null },
      });
      // Rejeição fica registrada nas duas timelines (§6.10) mesmo a
      // transação voltando a ser "só do dono" — o evento é o rastro, não o
      // vínculo em si.
      await fireEvent(fastify, userId, "portador.rejected", original.id, {
        counterpartUserId: original.userId,
      });
      await fireEvent(
        fastify,
        original.userId,
        "portador.rejected",
        original.id,
        {
          counterpartUserId: userId,
        },
      );
      return { ok: true };
    },
  );

  fastify.post(
    "/v1/portador/settle",
    { schema: { body: SettleBody }, preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof SettleBody>;

      if (!body.accountId === !body.creditCardId) {
        throw VALIDATION_FAILED([
          {
            field: "accountId",
            message:
              "Escolha de qual conta OU cartão sai/entra o acerto (nunca os dois).",
          },
        ]);
      }
      if (body.accountId) {
        const account = await fastify.prisma.account.findFirst({
          where: { id: body.accountId, userId },
        });
        if (!account) throw NOT_FOUND();
      }
      if (body.creditCardId) {
        const card = await fastify.prisma.creditCard.findFirst({
          where: { id: body.creditCardId, userId },
        });
        if (!card) throw NOT_FOUND();
      }

      const unsettled = await fastify.prisma.transaction.findMany({
        where: {
          userId,
          portadorUserId: body.counterpartUserId,
          portadorSettled: false,
        },
      });
      if (unsettled.length === 0) {
        throw VALIDATION_FAILED([
          {
            field: "counterpartUserId",
            message: "Não há nada pendente de acerto com esse usuário.",
          },
        ]);
      }
      // expense = eu paguei por ela/ele (a meu favor, ela me deve);
      // income = o inverso (eu devo). Mesma fórmula de GET /v1/connections.
      const netCents = unsettled.reduce((sum, tx) => {
        const sign = tx.kind === "expense" ? 1 : tx.kind === "income" ? -1 : 0;
        return sum + sign * tx.amountBRLCents;
      }, 0);

      const counterpart = await fastify.prisma.user.findUnique({
        where: { id: body.counterpartUserId },
      });

      const settlement = await fastify.prisma.transaction.create({
        data: {
          userId,
          accountId: body.accountId,
          creditCardId: body.creditCardId,
          // netCents > 0 → a meu favor → estou recebendo (income).
          // netCents < 0 → eu devia → estou pagando (expense).
          kind: netCents >= 0 ? "income" : "expense",
          source: "manual",
          description: `Acerto com ${counterpart?.name ?? "conexão"}`,
          transactionDate: new Date(),
          currency: "BRL",
          amountCents: Math.abs(netCents),
          amountBRLCents: Math.abs(netCents),
          portadorUserId: body.counterpartUserId,
          portadorSettled: true,
        },
      });

      await fastify.prisma.transaction.updateMany({
        where: {
          userId,
          portadorUserId: body.counterpartUserId,
          portadorSettled: false,
        },
        data: { portadorSettled: true },
      });

      await fireEvent(fastify, userId, "portador.settled", settlement.id, {
        counterpartUserId: body.counterpartUserId,
        transferTxId: settlement.id,
      });
      await fireEvent(
        fastify,
        body.counterpartUserId,
        "portador.settled",
        settlement.id,
        { counterpartUserId: userId, transferTxId: settlement.id },
      );

      reply.code(201);
      return { id: settlement.id, amountCents: settlement.amountCents };
    },
  );
}
