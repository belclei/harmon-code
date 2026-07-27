// apps/api/src/admin/usage-health-routes.ts
// BACKLOG.md US-9.1/US-9.2/US-9.3 — painéis Frequência de uso e Saúde do
// sistema. GET /v1/admin/usage só lê UsageDailyRollup (o rollup noturno em
// usage/rollup.ts é quem tem permissão de escanear UsageEvent) — exceção: o
// funil de ativação não vem de UsageEvent (nenhuma instrumentação de evento
// existe em nenhuma rota da aplicação ainda — gap pré-existente, não deste
// sprint) — deriva direto de Account/CreditCard, dado real, não telemetria.
//
// §6.2: admin nunca vê valor financeiro, só metadado/contagem — nenhum
// campo abaixo carrega um Cents.
//
// Saúde do sistema (US-9.3): fila de jobs, erros de importação, p95 de
// latência, custo estimado DeepSeek e deliverability do Resend exigem
// infraestrutura que não existe nesta base de código (BullMQ/fila real —
// os "jobs" hoje são scripts de cron, não uma fila consultável; coleta
// Prometheus de latência, mencionada em ARQUITETURA.md §7.5, nunca foi
// implementada; DeepSeek/import pipeline são o Épico 5, fora deste ciclo de
// trabalho; agregação de webhooks do Resend em uma tabela consultável não
// existe). Preencher esses campos com zero seria uma métrica falsa, não
// "vazia" — pior que não mostrar nada. Retorna só o que é real hoje (DB/Redis)
// e uma lista explícita do que falta, para a UI comunicar a lacuna, não escondê-la.
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "./require-admin.js";

const RETENTION_METRICS = [
  "retention_d1",
  "retention_d7",
  "retention_d30",
] as const;

async function latestMetric(
  fastify: FastifyInstance,
  metric: string,
): Promise<number> {
  const row = await fastify.prisma.usageDailyRollup.findFirst({
    where: { metric, dimension: "" },
    orderBy: { day: "desc" },
  });
  return row?.value ?? 0;
}

export async function registerAdminUsageHealthRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/admin/usage",
    { preHandler: requireAdmin(fastify) },
    async () => {
      const [dau, wau, mau, d1, d7, d30] = await Promise.all([
        latestMetric(fastify, "dau"),
        latestMetric(fastify, "wau"),
        latestMetric(fastify, "mau"),
        ...RETENTION_METRICS.map((m) => latestMetric(fastify, m)),
      ]);

      // Funil de ativação (Épico 4, §6.11): dado real das tabelas, não
      // telemetria — ver comentário de topo do arquivo.
      const nonAdminUsers = await fastify.prisma.user.findMany({
        where: { role: "user" },
        select: { id: true },
      });
      const userIds = nonAdminUsers.map((u) => u.id);
      const [walletAccounts, bankAccounts, cardOwners] = await Promise.all([
        fastify.prisma.account.findMany({
          where: { userId: { in: userIds }, type: "cash" },
          select: { userId: true },
          distinct: ["userId"],
        }),
        fastify.prisma.account.findMany({
          where: { userId: { in: userIds }, type: { not: "cash" } },
          select: { userId: true },
          distinct: ["userId"],
        }),
        fastify.prisma.creditCard.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true },
          distinct: ["userId"],
        }),
      ]);
      const walletSet = new Set(walletAccounts.map((a) => a.userId));
      const accountsSet = new Set(bankAccounts.map((a) => a.userId));
      const cardsSet = new Set(cardOwners.map((c) => c.userId));
      const allThree = userIds.filter(
        (id) => walletSet.has(id) && accountsSet.has(id) && cardsSet.has(id),
      ).length;

      return {
        dau,
        wau,
        mau,
        retention: { d1, d7, d30 },
        activationFunnel: {
          totalUsers: userIds.length,
          wallet: walletSet.size,
          accounts: accountsSet.size,
          cards: cardsSet.size,
          allThree,
        },
      };
    },
  );

  fastify.get(
    "/v1/admin/health",
    { preHandler: requireAdmin(fastify) },
    async () => {
      const [dbOk, redisOk] = await Promise.all([
        fastify.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        fastify.redis
          .ping()
          .then(() => true)
          .catch(() => false),
      ]);

      return {
        database: dbOk ? "ok" : "error",
        redis: redisOk ? "ok" : "error",
        notAvailable: [
          "jobQueue",
          "importErrors",
          "apiP95Ms",
          "deepSeekCostCents",
          "resendDeliverability",
        ],
      };
    },
  );
}
