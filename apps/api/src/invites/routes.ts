// apps/api/src/invites/routes.ts
// BACKLOG.md US-8.2 — convites usuário-a-usuário. Nasce awaiting_approval;
// o mesmo painel Acessos do Épico 7 (apps/api/src/admin/routes.ts) já sabe
// aprovar/rejeitar — esta rota só cria o pedido e lista o status pro convidante.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";

const CreateInviteBody = z
  .object({
    inviteeName: z.string().min(1),
    inviteeEmail: z.string().email(),
  })
  .strict();

export async function registerInviteRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/invites",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const invites = await fastify.prisma.invite.findMany({
        where: { inviterUserId: userId },
        orderBy: { createdAt: "desc" },
      });
      return invites.map((i) => ({
        id: i.id,
        inviteeName: i.inviteeName,
        inviteeEmail: i.inviteeEmail,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      }));
    },
  );

  fastify.post(
    "/v1/invites",
    { schema: { body: CreateInviteBody }, preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof CreateInviteBody>;

      const invite = await fastify.prisma.invite.create({
        data: {
          inviterUserId: userId,
          inviteeName: body.inviteeName,
          inviteeEmail: body.inviteeEmail,
        },
      });

      reply.code(201);
      return {
        id: invite.id,
        inviteeName: invite.inviteeName,
        inviteeEmail: invite.inviteeEmail,
        status: invite.status,
      };
    },
  );
}
