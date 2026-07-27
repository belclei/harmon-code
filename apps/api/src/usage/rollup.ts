// apps/api/src/usage/rollup.ts
// BACKLOG.md US-9.1 — job diário que agrega UsageEvent em UsageDailyRollup.
// Função pura de orquestração (mesmo padrão de recurring-transactions/
// fulfillment.ts e cards/invoice-events-job.ts) — o scheduler só chama com
// `asOf = agora`. GET /v1/admin/usage (routes.ts) só lê o resultado daqui,
// nunca escaneia UsageEvent — é ESTE job, rodando uma vez por dia, que tem
// permissão de fazer o full-scan.
//
// §7.5: "rollup noturno excluindo admins" — DAU/WAU/MAU contam só role=user.
//
// ⚠ Armadilha de fuso (mesma documentada em @harmon/core/dates.ts): uma data-
// calendário pura (meia-noite UTC representando um dia de São Paulo) NÃO pode
// passar de novo por `saoPauloYMD` — meia-noite UTC já é 21h do dia anterior
// em São Paulo (UTC−3), então reconverter desloca um dia pra trás. `asOf`
// (um instante real) passa por `saoPauloYMD` exatamente uma vez, aqui em
// `computeDailyRollup`; toda aritmética de dia depois disso (cohort de
// retenção, etc.) soma/subtrai milissegundos na data-calendário pura direto.
import { saoPauloYMD } from "@harmon/core";
import type { PrismaClient } from "@harmon/db";

const DAY_MS = 24 * 60 * 60 * 1000;

// ⚠ Segunda armadilha, distinta da de fuso documentada acima: UsageEvent.
// createdAt é um INSTANTE real (timestamp), não uma data-calendário pura
// como Transaction.transactionDate (@db.Date) — comparar `createdAt` contra
// [meia-noite UTC, 23:59:59.999 UTC] do dia-calendário SP está errado, pois
// meia-noite de São Paulo (UTC−3) cai às 03:00 UTC, não 00:00 UTC — os
// eventos das primeiras 3h de cada dia UTC na verdade pertencem ao dia SP
// ANTERIOR. Offset calculado via Intl (não hardcoded "3") — America/
// Sao_Paulo não observa horário de verão desde 2019, mas isso evita um
// número mágico mesmo assim.
const SP_OFFSET_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  timeZoneName: "shortOffset",
});

function saoPauloUtcOffsetMs(instant: Date): number {
  const part = SP_OFFSET_FORMATTER.formatToParts(instant).find(
    (p) => p.type === "timeZoneName",
  );
  const match = part?.value.match(/GMT([+-]\d+)(?::(\d+))?/);
  const hours = match ? Number(match[1]) : -3;
  const minutes = match?.[2] ? Number(match[2]) : 0;
  const sign = hours < 0 ? -1 : 1;
  return (hours * 60 + sign * minutes) * 60 * 1000;
}

/** `pureDay` já é meia-noite UTC representando uma data-calendário SP —
 * nunca um instante bruto (não chama saoPauloYMD, ver armadilha #1 acima).
 * Retorna o intervalo de INSTANTES reais em UTC que correspondem a
 * "00:00:00 até 23:59:59.999 desse dia em São Paulo" (armadilha #2). */
function pureDayBounds(pureDay: Date): { start: Date; end: Date } {
  const offsetMs = saoPauloUtcOffsetMs(pureDay);
  const start = new Date(pureDay.getTime() - offsetMs);
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

async function distinctActiveUserCount(
  prisma: PrismaClient,
  from: Date,
  to: Date,
  nonAdminUserIds: string[],
): Promise<number> {
  const rows = await prisma.usageEvent.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      userId: { in: nonAdminUserIds },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.length;
}

/** % de usuários cujo primeiro UsageEvent foi exatamente `offsetDays` antes de
 * `pureDay`, e que tiveram QUALQUER evento no próprio `pureDay` (retenção clássica). */
async function retentionPercent(
  prisma: PrismaClient,
  pureDay: Date,
  offsetDays: number,
  nonAdminUserIds: string[],
): Promise<number> {
  const cohortDay = new Date(pureDay.getTime() - offsetDays * DAY_MS);
  const cohortBounds = pureDayBounds(cohortDay);

  const firstEvents = await prisma.usageEvent.groupBy({
    by: ["userId"],
    where: { userId: { in: nonAdminUserIds } },
    _min: { createdAt: true },
  });
  const cohort = firstEvents
    .filter(
      (f) =>
        f._min.createdAt &&
        f._min.createdAt >= cohortBounds.start &&
        f._min.createdAt <= cohortBounds.end &&
        f.userId !== null,
    )
    .map((f) => f.userId as string);
  if (cohort.length === 0) return 0;

  const todayBounds = pureDayBounds(pureDay);
  const returned = await prisma.usageEvent.findMany({
    where: {
      userId: { in: cohort },
      createdAt: { gte: todayBounds.start, lte: todayBounds.end },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return Math.round((returned.length / cohort.length) * 100);
}

export interface RollupResult {
  day: string;
  metrics: Record<string, number>;
}

export async function computeDailyRollup(
  prisma: PrismaClient,
  asOf: Date,
): Promise<RollupResult> {
  // Única conversão instante→data-calendário pura de toda a função.
  const { year, month, day } = saoPauloYMD(asOf);
  const dayDate = new Date(Date.UTC(year, month - 1, day));
  const today = pureDayBounds(dayDate);

  const nonAdmins = await prisma.user.findMany({
    where: { role: "user" },
    select: { id: true },
  });
  const nonAdminUserIds = nonAdmins.map((u) => u.id);

  const dau = await distinctActiveUserCount(
    prisma,
    today.start,
    today.end,
    nonAdminUserIds,
  );
  const wau = await distinctActiveUserCount(
    prisma,
    new Date(today.end.getTime() - 6 * DAY_MS),
    today.end,
    nonAdminUserIds,
  );
  const mau = await distinctActiveUserCount(
    prisma,
    new Date(today.end.getTime() - 29 * DAY_MS),
    today.end,
    nonAdminUserIds,
  );
  const d1 = await retentionPercent(prisma, dayDate, 1, nonAdminUserIds);
  const d7 = await retentionPercent(prisma, dayDate, 7, nonAdminUserIds);
  const d30 = await retentionPercent(prisma, dayDate, 30, nonAdminUserIds);

  const metrics: Record<string, number> = {
    dau,
    wau,
    mau,
    retention_d1: d1,
    retention_d7: d7,
    retention_d30: d30,
  };

  for (const [metric, value] of Object.entries(metrics)) {
    await prisma.usageDailyRollup.upsert({
      where: { day_metric_dimension: { day: dayDate, metric, dimension: "" } },
      update: { value },
      create: { day: dayDate, metric, dimension: "", value },
    });
  }

  return { day: dayDate.toISOString().slice(0, 10), metrics };
}
