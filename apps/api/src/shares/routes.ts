// apps/api/src/shares/routes.ts
// BACKLOG.md US-6.2 — compartilhamento de conta/cartão entre conectados
// (ARQUITETURA.md §6.10). Permissão escolhida na hora do share: view (ver
// entidade/saldo/transações) ou edit (tudo de view + criar/editar
// transações e dados da entidade, exceto apagar — deleção fica só com o
// dono, sempre).
import type { Prisma } from "@lurem/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import {
  CONNECTION_NOT_ACCEPTED,
  NOT_FOUND,
  SHARE_NOT_OWNER,
  VALIDATION_FAILED,
} from "../errors.js";

const CreateShareBody = z
  .object({
    sharedWithUserId: z.string().min(1),
    itemType: z.enum(["account", "credit_card"]),
    accountId: z.string().min(1).optional(),
    creditCardId: z.string().min(1).optional(),
    permission: z.enum(["view", "edit"]),
  })
  .strict();

const UpdateShareBody = z
  .object({ permission: z.enum(["view", "edit"]) })
  .strict();

async function fireEvent(
  fastify: FastifyInstance,
  userId: string,
  type: string,
  aggregateId: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  await fastify.prisma.domainEvent.create({
    data: { userId, type, aggregateType: "SharedItem", aggregateId, payload },
  });
}

export async function registerShareRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/shares",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const shares = await fastify.prisma.sharedItem.findMany({
        where: { OR: [{ ownerUserId: userId }, { sharedWithUserId: userId }] },
        orderBy: { createdAt: "desc" },
      });
      return shares.map((s) => ({
        id: s.id,
        ownerUserId: s.ownerUserId,
        sharedWithUserId: s.sharedWithUserId,
        itemType: s.itemType,
        accountId: s.accountId,
        creditCardId: s.creditCardId,
        permission: s.permission,
        isOwner: s.ownerUserId === userId,
        createdAt: s.createdAt.toISOString(),
      }));
    },
  );

  fastify.post(
    "/v1/shares",
    { schema: { body: CreateShareBody }, preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof CreateShareBody>;

      if (body.itemType === "account") {
        if (!body.accountId || body.creditCardId) {
          throw VALIDATION_FAILED([
            { field: "accountId", message: "Informe accountId (só ele)." },
          ]);
        }
        const account = await fastify.prisma.account.findFirst({
          where: { id: body.accountId, userId },
        });
        if (!account) throw NOT_FOUND();
      } else {
        if (!body.creditCardId || body.accountId) {
          throw VALIDATION_FAILED([
            {
              field: "creditCardId",
              message: "Informe creditCardId (só ele).",
            },
          ]);
        }
        const card = await fastify.prisma.creditCard.findFirst({
          where: { id: body.creditCardId, userId },
        });
        if (!card) throw NOT_FOUND();
      }

      const connection = await fastify.prisma.userConnection.findFirst({
        where: {
          status: "accepted",
          OR: [
            { requesterUserId: userId, addresseeUserId: body.sharedWithUserId },
            { requesterUserId: body.sharedWithUserId, addresseeUserId: userId },
          ],
        },
      });
      if (!connection) {
        throw CONNECTION_NOT_ACCEPTED();
      }

      const share = await fastify.prisma.sharedItem.create({
        data: {
          ownerUserId: userId,
          sharedWithUserId: body.sharedWithUserId,
          itemType: body.itemType,
          accountId: body.accountId,
          creditCardId: body.creditCardId,
          permission: body.permission,
        },
      });
      await fireEvent(fastify, userId, "share.granted", share.id, {
        itemType: body.itemType,
        permission: body.permission,
        counterpartUserId: body.sharedWithUserId,
      });
      await fireEvent(
        fastify,
        body.sharedWithUserId,
        "share.granted",
        share.id,
        {
          itemType: body.itemType,
          permission: body.permission,
          counterpartUserId: userId,
        },
      );

      reply.code(201);
      return { id: share.id, permission: share.permission };
    },
  );

  fastify.patch(
    "/v1/shares/:id",
    { schema: { body: UpdateShareBody }, preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof UpdateShareBody>;

      const existing = await fastify.prisma.sharedItem.findUnique({
        where: { id },
      });
      if (!existing) throw NOT_FOUND();
      if (existing.ownerUserId !== userId) throw SHARE_NOT_OWNER();

      const updated = await fastify.prisma.sharedItem.update({
        where: { id },
        data: { permission: body.permission },
      });
      await fireEvent(fastify, userId, "share.permission_changed", id, {
        itemType: existing.itemType,
        from: existing.permission,
        to: body.permission,
        counterpartUserId: existing.sharedWithUserId,
      });
      await fireEvent(
        fastify,
        existing.sharedWithUserId,
        "share.permission_changed",
        id,
        {
          itemType: existing.itemType,
          from: existing.permission,
          to: body.permission,
          counterpartUserId: userId,
        },
      );
      return { id: updated.id, permission: updated.permission };
    },
  );

  fastify.delete(
    "/v1/shares/:id",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const existing = await fastify.prisma.sharedItem.findUnique({
        where: { id },
      });
      if (!existing) throw NOT_FOUND();
      if (existing.ownerUserId !== userId) throw SHARE_NOT_OWNER();

      await fastify.prisma.sharedItem.delete({ where: { id } });
      await fireEvent(fastify, userId, "share.revoked", id, {
        itemType: existing.itemType,
        counterpartUserId: existing.sharedWithUserId,
      });
      await fireEvent(fastify, existing.sharedWithUserId, "share.revoked", id, {
        itemType: existing.itemType,
        counterpartUserId: userId,
      });
      return { ok: true };
    },
  );
}
