// apps/api/src/jobs/run-fulfillment.ts
// Entrypoint do job diário de recorrências (US-3.8). O scheduler de deploy
// (cron/worker) invoca `npm run job:fulfillment --workspace=@lurem/api` uma
// vez por dia; a lógica idempotente vive em recurring-transactions/fulfillment.
import { PrismaClient } from "@lurem/db";
import { fulfillDueRecurrences } from "../recurring-transactions/fulfillment.js";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const created = await fulfillDueRecurrences(prisma, new Date());
    // stdout simples — o cron coleta; sem logger estruturado para um script one-shot.
    console.log(
      `[fulfillment] ${created.length} ocorrência(s) agendada(s) criada(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[fulfillment] falhou:", err);
  process.exit(1);
});
