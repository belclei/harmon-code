// apps/api/src/admin/require-admin.ts
// BACKLOG.md US-7.1 — todas as rotas /v1/admin/* exigem role=admin.
// request.userRole vem do JWT (§6.1) — reflete o papel no momento do login/
// refresh, não em tempo real; uma promoção só se aplica na próxima renovação
// de token, mesma janela de propagação de qualquer claim de access token.
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireUser } from "../auth/authenticate.js";
import { ADMIN_FORBIDDEN } from "../errors.js";

export function requireAdmin(fastify: FastifyInstance) {
  const requireUserHandler = requireUser(fastify);
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireUserHandler(request, reply);
    if (request.userRole !== "admin") {
      throw ADMIN_FORBIDDEN();
    }
  };
}
