// apps/api/src/jobs/run-usage-rollup.ts
// Entrypoint do job diário de rollup de telemetria (US-9.1). O scheduler de
// deploy invoca `npm run job:usage-rollup --workspace=@harmon/api` uma vez
// por dia; a lógica vive em usage/rollup.ts.
import { PrismaClient } from "@harmon/db";
import { computeDailyRollup } from "../usage/rollup.js";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const result = await computeDailyRollup(prisma, new Date());
    console.log(`[usage-rollup] ${result.day}:`, result.metrics);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[usage-rollup] falhou:", err);
  process.exit(1);
});
