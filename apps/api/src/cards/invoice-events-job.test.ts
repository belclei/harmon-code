import type { FastifyInstance } from "fastify";
// apps/api/src/cards/invoice-events-job.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";
import { closeDueInvoices } from "./invoice-events-job.js";

const TEST_ENV = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://harmon:harmon@localhost:5433/harmon",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "x".repeat(32),
  GOOGLE_CLIENT_ID: "placeholder",
  RESEND_API_KEY: "placeholder",
  RESEND_WEBHOOK_SECRET: "placeholder",
  PORT: 3001,
};

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer(TEST_ENV);
});
afterEach(async () => {
  await resetTestDb(server.prisma);
});
afterAll(async () => {
  await server.close();
});

async function createUserAndCard(overrides: {
  closingDay: number;
  dueDay: number;
}) {
  const user = await server.prisma.user.create({
    data: {
      email: `user-${Math.random().toString(36).slice(2)}@harmon.dev`,
      name: "Card User",
      birthDate: new Date("1990-01-01"),
    },
  });
  const institution = await server.prisma.institution.create({
    data: {
      name: "Nubank",
      compeCode: `260-${Math.random().toString(36).slice(2)}`,
      logoAsset: "nubank.svg",
    },
  });
  const card = await server.prisma.creditCard.create({
    data: {
      userId: user.id,
      institutionId: institution.id,
      limitCents: 100_000,
      closingDay: overrides.closingDay,
      dueDay: overrides.dueDay,
    },
  });
  return { user, card };
}

describe("closeDueInvoices", () => {
  it("fires card.invoice_closed exactly on the closing day, with the period's total", async () => {
    // asOf = 2026-03-10 (São Paulo) — closingDay=10 → closingDate(card,2026,3) = 2026-03-10.
    const { user, card } = await createUserAndCard({
      closingDay: 10,
      dueDay: 20,
    });
    await server.prisma.transaction.create({
      data: {
        userId: user.id,
        creditCardId: card.id,
        kind: "expense",
        description: "Dentro do período",
        transactionDate: new Date("2026-03-05"),
        amountCents: 8_000,
        amountBRLCents: 8_000,
      },
    });

    const result = await closeDueInvoices(
      server.prisma,
      new Date("2026-03-10T15:00:00Z"),
    );

    expect(result.closedFired).toBe(1);
    const events = await server.prisma.domainEvent.findMany({
      where: { aggregateId: card.id, type: "card.invoice_closed" },
    });
    expect(events).toHaveLength(1);
    expect(events.at(0)?.payload).toMatchObject({ totalCents: 8_000 });
  });

  it("fires card.invoice_due exactly on the due day", async () => {
    const { card } = await createUserAndCard({ closingDay: 10, dueDay: 20 });

    const result = await closeDueInvoices(
      server.prisma,
      new Date("2026-03-20T15:00:00Z"),
    );

    expect(result.dueFired).toBe(1);
    const events = await server.prisma.domainEvent.findMany({
      where: { aggregateId: card.id, type: "card.invoice_due" },
    });
    expect(events).toHaveLength(1);
  });

  it("does not duplicate the event if the job runs twice the same day", async () => {
    const { card } = await createUserAndCard({ closingDay: 10, dueDay: 20 });
    const asOf = new Date("2026-03-10T09:00:00Z");

    await closeDueInvoices(server.prisma, asOf);
    await closeDueInvoices(server.prisma, new Date("2026-03-10T21:00:00Z"));

    const events = await server.prisma.domainEvent.count({
      where: { aggregateId: card.id, type: "card.invoice_closed" },
    });
    expect(events).toBe(1);
  });

  it("does nothing on a day that is neither closing nor due", async () => {
    await createUserAndCard({ closingDay: 10, dueDay: 20 });

    const result = await closeDueInvoices(
      server.prisma,
      new Date("2026-03-15T12:00:00Z"),
    );

    expect(result.closedFired).toBe(0);
    expect(result.dueFired).toBe(0);
  });

  it("skips inactive cards", async () => {
    const { card } = await createUserAndCard({ closingDay: 10, dueDay: 20 });
    await server.prisma.creditCard.update({
      where: { id: card.id },
      data: { isActive: false },
    });

    const result = await closeDueInvoices(
      server.prisma,
      new Date("2026-03-10T12:00:00Z"),
    );

    expect(result.closedFired).toBe(0);
  });
});
