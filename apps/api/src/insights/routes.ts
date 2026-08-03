// apps/api/src/insights/routes.ts
// BACKLOG.md US-3.10 — GET /v1/insights/dashboard?asOf=…: os 3 cards (§6.9),
// cada um Money com breakdown (§3). Cache Redis 60s invalidado por escrita
// (§5.6/§7.8) — ver cache.ts para a estratégia de geração por usuário.
import { saoPauloYMD } from "@lurem/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import {
  insightsGen,
  readDashboardCache,
  writeDashboardCache,
} from "./cache.js";
import { computeDashboard } from "./compute.js";
import { loadInsightsDataset } from "./load.js";

const DashboardQuery = z.object({
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "asOf no formato AAAA-MM-DD.")
    .optional(),
});

/**
 * Converte a data-calendário AAAA-MM-DD num INSTANTE que o core lê como esse
 * dia em America/Sao_Paulo. asOf é sempre um instante para o core (balance faz
 * todayAsDate(asOf) internamente); meio-dia UTC evita o off-by-one que meia-
 * noite UTC causaria em SP (UTC−3). Ver a armadilha documentada em dates.ts.
 */
function asOfInstant(ymd: string): Date {
  const parts = ymd.split("-");
  return new Date(
    Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12),
  );
}

export async function registerInsightRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const { prisma, redis } = fastify;

  fastify.get(
    "/v1/insights/dashboard",
    {
      schema: { querystring: DashboardQuery },
      preHandler: requireUser(fastify),
    },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler
      const userId = request.userId!;
      const { asOf } = request.query as z.infer<typeof DashboardQuery>;

      // asOf ausente → hoje em SP. Normalizar a chave para a data-calendário
      // (não o instante bruto) mantém o cache estável entre chamadas no dia.
      const { year, month, day } = saoPauloYMD(new Date());
      const ymd =
        asOf ??
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const gen = await insightsGen(redis, userId);
      const cached = await readDashboardCache(redis, userId, gen, ymd);
      if (cached) return JSON.parse(cached);

      const dataset = await loadInsightsDataset(prisma, userId);
      const result = computeDashboard(dataset, asOfInstant(ymd));
      await writeDashboardCache(
        redis,
        userId,
        gen,
        ymd,
        JSON.stringify(result),
      );
      return result;
    },
  );
}
