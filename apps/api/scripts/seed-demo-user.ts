// apps/api/scripts/seed-demo-user.ts
// Cria um usuário com senha + conta/cartão/categorias para validação visual
// local das telas do Sprint 5. NÃO é seed de produção — é fixture de dev.
import { PrismaClient } from "@harmon/db";
import { hashPassword } from "../src/auth/password.js";

const EMAIL = "demo@harmon.dev";
const PASSWORD = "harmon123";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      await prisma.transaction.deleteMany({ where: { userId: existing.id } });
      await prisma.recurringTransaction.deleteMany({
        where: { userId: existing.id },
      });
      await prisma.creditCard.deleteMany({ where: { userId: existing.id } });
      await prisma.account.deleteMany({ where: { userId: existing.id } });
      await prisma.category.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: "Demo Harmon",
        birthDate: new Date("1990-01-01"),
        passwordHash: await hashPassword(PASSWORD),
      },
    });

    const inst = await prisma.institution.upsert({
      where: { compeCode: "260" },
      update: {},
      create: {
        name: "Nubank",
        compeCode: "260",
        // Caminho completo servido por apps/web/public — logoUrl = `/${logoAsset}`.
        logoAsset: "ui-tokens/institutions/nubank.svg",
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        type: "checking",
        institutionId: inst.id,
        name: "Conta principal",
        currency: "BRL",
        openingBalanceCents: 250_000,
        overdraftLimitCents: 50_000,
        reconciledBalanceCents: 250_000,
        reconciledAt: new Date(),
      },
    });
    await prisma.creditCard.create({
      data: {
        userId: user.id,
        institutionId: inst.id,
        name: "Cartão Nubank",
        limitCents: 500_000,
        closingDay: 20,
        dueDay: 28,
      },
    });
    await prisma.category.createMany({
      data: [
        {
          userId: user.id,
          name: "Mercado",
          kind: "expense",
          icon: "cart",
          colorToken: "--hm-clay-500",
        },
        {
          userId: user.id,
          name: "Salário",
          kind: "income",
          icon: "wallet",
          colorToken: "--hm-sage-500",
        },
      ],
    });

    console.log(`Demo user ready: ${EMAIL} / ${PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
