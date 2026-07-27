// apps/api/src/access/routes.ts
// BACKLOG.md US-8.1/US-8.3 — fila de acesso pública e cadastro via token
// (ARQUITETURA.md §6.0/§6.1). Rotas públicas (sem requireUser).
//
// Escopo: cadastro aqui é só e-mail/senha. A spec também descreve "ou Google
// OAuth" na tela de cadastro — POST /v1/auth/google (auth/routes.ts) já
// cria um usuário oportunisticamente na primeira vez que alguém loga via
// Google (birthDate placeholder, comentário no próprio arquivo aponta pra
// cá: "Épico 8, fora de escopo"). Ligar esse caminho a um token de
// convite/fila (em vez de aceitar qualquer e-mail do Google, sem gate) e
// construir a tela obrigatória de completar `birthDate` no primeiro login
// são mudanças em auth/google.ts, não nesta rota — registrado como
// pendência, não implementado aqui por ser escopo maior que uma rota nova.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { signAccessToken } from "../auth/jwt.js";
import { hashPassword } from "../auth/password.js";
import {
  hashToken,
  issueRefreshTokenFamily,
  setRefreshCookie,
} from "../auth/refresh-tokens.js";
import {
  AUTH_TOKEN_EXPIRED,
  AUTH_TOKEN_INVALID,
  VALIDATION_FAILED,
} from "../errors.js";

const WaitlistBody = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    // Honeypot: campo invisível no form real (CSS), só um bot preenche.
    // Silenciosamente descartado — nunca um erro que ensine o bot a se adaptar.
    website: z.string().optional(),
  })
  .strict();

const NEUTRAL_WAITLIST_RESPONSE = {
  message: "Você está na fila. Avisaremos por e-mail quando for liberado.",
};

const RegisterPreviewQuery = z.object({ token: z.string().min(1) });

const RegisterBody = z
  .object({
    token: z.string().min(1),
    name: z.string().min(1),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
    password: z.string().min(8),
  })
  .strict();

async function findByToken(fastify: FastifyInstance, token: string) {
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

function assertUsable(
  found: NonNullable<Awaited<ReturnType<typeof findByToken>>>,
): void {
  if (found.entry.status !== "approved") {
    throw AUTH_TOKEN_INVALID();
  }
  if (!found.entry.tokenExpiresAt || found.entry.tokenExpiresAt < new Date()) {
    throw AUTH_TOKEN_EXPIRED();
  }
}

export async function registerAccessRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/v1/access/waitlist",
    {
      schema: { body: WaitlistBody },
      // §7.4 — waitlist e upload: 10/h. Chave por IP (endpoint anônimo, sem
      // e-mail confiável pra chavear antes de validar).
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request) => {
      const body = request.body as z.infer<typeof WaitlistBody>;

      // Honeypot preenchido → finge sucesso, não grava nada.
      if (body.website) {
        return NEUTRAL_WAITLIST_RESPONSE;
      }

      const [existingUser, existingEntry] = await Promise.all([
        fastify.prisma.user.findUnique({ where: { email: body.email } }),
        fastify.prisma.waitlistEntry.findFirst({
          where: { email: body.email },
        }),
      ]);
      // Mensagem neutra em qualquer um dos três casos (já usuário, já na
      // fila, ou novo) — nunca revela pra quem pergunta qual desses é.
      if (!existingUser && !existingEntry) {
        await fastify.prisma.waitlistEntry.create({
          data: { name: body.name, email: body.email },
        });
      }
      return NEUTRAL_WAITLIST_RESPONSE;
    },
  );

  fastify.get(
    "/v1/auth/register/preview",
    { schema: { querystring: RegisterPreviewQuery } },
    async (request) => {
      const { token } = request.query as z.infer<typeof RegisterPreviewQuery>;
      const found = await findByToken(fastify, token);
      if (!found) throw AUTH_TOKEN_INVALID();
      assertUsable(found);

      if (found.kind === "waitlist") {
        return { email: found.entry.email, inviterName: null };
      }
      const inviter = await fastify.prisma.user.findUnique({
        where: { id: found.entry.inviterUserId },
      });
      return {
        email: found.entry.inviteeEmail,
        inviterName: inviter?.name ?? null,
      };
    },
  );

  fastify.post(
    "/v1/auth/register",
    { schema: { body: RegisterBody } },
    async (request, reply) => {
      const body = request.body as z.infer<typeof RegisterBody>;
      const found = await findByToken(fastify, body.token);
      if (!found) throw AUTH_TOKEN_INVALID();
      assertUsable(found);

      const email =
        found.kind === "waitlist"
          ? found.entry.email
          : found.entry.inviteeEmail;
      const alreadyRegistered = await fastify.prisma.user.findUnique({
        where: { email },
      });
      if (alreadyRegistered) {
        throw VALIDATION_FAILED([
          { field: "token", message: "Este e-mail já tem uma conta." },
        ]);
      }

      const passwordHash = await hashPassword(body.password);
      const user = await fastify.prisma.user.create({
        data: {
          email,
          name: body.name,
          birthDate: new Date(`${body.birthDate}T00:00:00.000Z`),
          passwordHash,
        },
      });

      if (found.kind === "waitlist") {
        await fastify.prisma.waitlistEntry.update({
          where: { id: found.entry.id },
          data: { status: "registered", registeredUserId: user.id },
        });
      } else {
        await fastify.prisma.invite.update({
          where: { id: found.entry.id },
          data: { status: "registered", registeredUserId: user.id },
        });
      }

      // Mesmo padrão de POST /v1/auth/login — cadastro já entra logado.
      const accessToken = await signAccessToken(
        { sub: user.id, role: user.role },
        fastify.env.JWT_SECRET,
      );
      const { token: refreshToken } = await issueRefreshTokenFamily(
        fastify.prisma,
        user.id,
      );
      setRefreshCookie(reply, refreshToken);

      reply.code(201);
      return { accessToken };
    },
  );
}
