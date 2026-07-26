// apps/api/src/settings/routes.ts
// BACKLOG.md US-3.13 (dados pessoais/senha/tema) e US-3.14 (zona de risco).
//
// Escopo deliberadamente menor que ARQUITETURA.md §6.13 lista: o campo
// "e-mail" fica de fora do PATCH de dados pessoais. A spec diz que trocar
// o e-mail "dispara fluxo de confirmação (§7.4)", mas §7.4 é a seção de
// segurança geral — não existe ali (nem em nenhum outro lugar) um contrato
// concreto para esse fluxo (copy do e-mail de confirmação, prazo do token,
// se o e-mail antigo é notificado, schema para armazenar o e-mail pendente).
// Por Definition of Ready (BACKLOG.md §0): "se uma história precisar de uma
// decisão que os dois não tomaram, é bug — escalar, não inventar aqui".
// Registrado para decisão do usuário; ver fechamento do Sprint 6b.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  NOT_FOUND,
  SETTINGS_DELETE_CONFIRMATION_MISMATCH,
  SETTINGS_PASSWORD_NOT_SET,
  SETTINGS_WRONG_PASSWORD,
} from "../errors.js";

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD.");

const UpdatePersonalBody = z
  .object({
    name: z.string().min(1).optional(),
    birthDate: IsoDate.optional(),
  })
  .strict();

const UpdateThemeBody = z
  .object({ themePref: z.enum(["light", "dark"]) })
  .strict();

const ChangePasswordBody = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .strict();

const DeleteAccountBody = z.object({ confirmation: z.string() }).strict();

export async function registerSettingsRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.patch(
    "/v1/me",
    { schema: { body: UpdatePersonalBody }, preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof UpdatePersonalBody>;

      const user = await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.birthDate !== undefined
            ? { birthDate: new Date(`${body.birthDate}T00:00:00.000Z`) }
            : {}),
        },
      });

      return {
        id: user.id,
        name: user.name,
        birthDate: user.birthDate.toISOString().slice(0, 10),
      };
    },
  );

  fastify.patch(
    "/v1/me/theme",
    { schema: { body: UpdateThemeBody }, preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof UpdateThemeBody>;

      const user = await fastify.prisma.user.update({
        where: { id: userId },
        data: { themePref: body.themePref },
      });

      return { themePref: user.themePref };
    },
  );

  fastify.post(
    "/v1/me/password",
    { schema: { body: ChangePasswordBody }, preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof ChangePasswordBody>;

      const user = await fastify.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      // Conta só-Google (§6.1): passwordHash nulo, não mostra a seção de
      // senha na tela — a API espelha a mesma regra do lado do servidor.
      if (!user.passwordHash) {
        throw SETTINGS_PASSWORD_NOT_SET();
      }
      const valid = await verifyPassword(
        user.passwordHash,
        body.currentPassword,
      );
      if (!valid) {
        throw SETTINGS_WRONG_PASSWORD();
      }

      const passwordHash = await hashPassword(body.newPassword);
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return { ok: true };
    },
  );

  fastify.post(
    "/v1/me/delete",
    { schema: { body: DeleteAccountBody }, preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof DeleteAccountBody>;

      // Sem exclusão de um clique (US-3.14) — exige digitar "APAGAR" literal.
      if (body.confirmation !== "APAGAR") {
        throw SETTINGS_DELETE_CONFIRMATION_MISMATCH();
      }

      const existing = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!existing) {
        throw NOT_FOUND();
      }

      const recurringIds = (
        await fastify.prisma.recurringTransaction.findMany({
          where: { userId },
          select: { id: true },
        })
      ).map((r) => r.id);
      const importedDocIds = (
        await fastify.prisma.importedDocument.findMany({
          where: { userId },
          select: { id: true },
        })
      ).map((d) => d.id);
      const investmentIds = (
        await fastify.prisma.investment.findMany({
          where: { userId },
          select: { id: true },
        })
      ).map((i) => i.id);

      // Contas/cartões/transações/recorrências/conexões somem do banco vivo
      // imediatamente (US-3.14); cópias em backup seguem a retenção normal
      // (§7.6) — não é apagado daqui, é política de infraestrutura.
      // DomainEvent/UsageEvent ficam: não carregam valor financeiro nem PII
      // em texto livre (§7.2), o direito de deleção não os alcança.
      await fastify.prisma.$transaction([
        fastify.prisma.extractedTransaction.deleteMany({
          where: { importedDocumentId: { in: importedDocIds } },
        }),
        fastify.prisma.importedDocument.deleteMany({ where: { userId } }),
        fastify.prisma.recurringFulfillment.deleteMany({
          where: { recurringTransactionId: { in: recurringIds } },
        }),
        fastify.prisma.recurringTransaction.deleteMany({ where: { userId } }),
        fastify.prisma.transaction.deleteMany({ where: { userId } }),
        fastify.prisma.investmentMovement.deleteMany({
          where: { investmentId: { in: investmentIds } },
        }),
        fastify.prisma.investment.deleteMany({ where: { userId } }),
        fastify.prisma.sharedItem.deleteMany({
          where: {
            OR: [{ ownerUserId: userId }, { sharedWithUserId: userId }],
          },
        }),
        fastify.prisma.userConnection.deleteMany({
          where: {
            OR: [{ requesterUserId: userId }, { addresseeUserId: userId }],
          },
        }),
        fastify.prisma.account.deleteMany({ where: { userId } }),
        fastify.prisma.creditCard.deleteMany({ where: { userId } }),
        fastify.prisma.category.deleteMany({ where: { userId } }),
        fastify.prisma.featureFlagOverride.deleteMany({ where: { userId } }),
        // Sessões ativas morrem junto — o usuário não pode continuar
        // navegando com um accessToken já emitido após apagar a conta.
        fastify.prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        // Soft-delete do User em si (padrão do projeto, §0 do schema) —
        // isUserActive() passa a barrar login/refresh/me imediatamente.
        fastify.prisma.user.update({
          where: { id: userId },
          data: { deletedAt: new Date(), status: "disabled" },
        }),
      ]);

      return { ok: true };
    },
  );
}
