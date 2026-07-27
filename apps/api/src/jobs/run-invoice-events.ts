// apps/api/src/jobs/run-invoice-events.ts
// Entrypoint do job diário de fechamento/vencimento de fatura (US-6.1). O
// scheduler de deploy (cron/worker) invoca
// `npm run job:invoice-events --workspace=@harmon/api` uma vez por dia; a
// lógica idempotente vive em cards/invoice-events-job.
import { PrismaClient } from "@harmon/db";
import { closeDueInvoices } from "../cards/invoice-events-job.js";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const { closedFired, dueFired } = await closeDueInvoices(
      prisma,
      new Date(),
    );
    console.log(
      `[invoice-events] ${closedFired} fechamento(s), ${dueFired} vencimento(s) disparado(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[invoice-events] falhou:", err);
  process.exit(1);
});
