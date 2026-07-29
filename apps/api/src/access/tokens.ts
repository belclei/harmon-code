import type { FastifyInstance } from "fastify";
import { hashToken } from "../auth/refresh-tokens.js";
import { AUTH_TOKEN_EXPIRED, AUTH_TOKEN_INVALID } from "../errors.js";

// §6.1 — convite e fila de acesso usam o mesmo TTL de 7 dias pro link de
// registro. Compartilhado aqui porque admin/routes.ts (approve) e
// invites/routes.ts (resend) precisam do mesmo valor.
export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function findByToken(fastify: FastifyInstance, token: string) {
  const tokenHash = hashToken(token);
  const waitlist = await fastify.prisma.waitlistEntry.findFirst({
    where: { registrationTokenHash: tokenHash },
  });
  if (waitlist) return { kind: "waitlist" as const, entry: waitlist };
  const invite = await fastify.prisma.invite.findFirst({
    where: { registrationTokenHash: tokenHash },
  });
  if (invite) return { kind: "invite" as const, entry: invite };
  return null;
}

export function assertUsable(
  found: NonNullable<Awaited<ReturnType<typeof findByToken>>>,
): void {
  if (found.entry.status !== "approved") {
    throw AUTH_TOKEN_INVALID();
  }
  if (!found.entry.tokenExpiresAt || found.entry.tokenExpiresAt < new Date()) {
    throw AUTH_TOKEN_EXPIRED();
  }
}
