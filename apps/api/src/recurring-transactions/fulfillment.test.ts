import type { PrismaClient } from "@harmon/db";
// apps/api/src/recurring-transactions/fulfillment.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuthedUser } from "../../test/auth-helper.js";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";
import { fulfillDueRecurrences } from "./fulfillment.js";

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

let prisma: PrismaClient;
let server: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  server = await buildServer(TEST_ENV);
  prisma = server.prisma;
});
afterEach(async () => {
  await resetTestDb(prisma);
});
afterAll(async () => {
  await server.close();
});

async function seriesForUser(
  dayOfMonth: number,
  over: Record<string, unknown> = {},
) {
  const { userId } = await createAuthedUser(prisma, TEST_ENV.JWT_SECRET);
  const inst = await prisma.institution.create({
    data: {
      name: "Nubank",
      compeCode: `260-${Math.random().toString(36).slice(2, 7)}`,
      logoAsset: "nubank.svg",
    },
  });
  const account = await prisma.account.create({
    data: {
      userId,
      type: "checking",
      institutionId: inst.id,
      currency: "BRL",
      openingBalanceCents: 0,
      overdraftLimitCents: 0,
    },
  });
  const series = await prisma.recurringTransaction.create({
    data: {
      userId,
      description: "Aluguel",
      kind: "expense",
      accountId: account.id,
      referenceAmountCents: 150_000,
      referenceAmountBRLCents: 150_000,
      dayOfMonth,
      startDate: new Date("2026-01-01"),
      ...over,
    },
  });
  return { userId, series };
}

describe("fulfillDueRecurrences (US-3.8)", () => {
  it("auto-creates a scheduled occurrence for a series due today", async () => {
    // 2026-07-10 in America/Sao_Paulo
    const asOf = new Date("2026-07-10T12:00:00-03:00");
    const { series } = await seriesForUser(10);

    const created = await fulfillDueRecurrences(prisma, asOf);
    expect(created).toHaveLength(1);
    expect(created[0]?.recurringTransactionId).toBe(series.id);
    expect(created[0]?.isScheduled).toBe(true);
    expect(created[0]?.amountCents).toBe(150_000);
  });

  it("is idempotent — a second run the same month creates nothing", async () => {
    const asOf = new Date("2026-07-10T12:00:00-03:00");
    await seriesForUser(10);
    await fulfillDueRecurrences(prisma, asOf);
    const second = await fulfillDueRecurrences(prisma, asOf);
    expect(second).toHaveLength(0);
  });

  it("skips a series whose due day is not today", async () => {
    const asOf = new Date("2026-07-10T12:00:00-03:00");
    await seriesForUser(25);
    const created = await fulfillDueRecurrences(prisma, asOf);
    expect(created).toHaveLength(0);
  });

  it("skips a paused series", async () => {
    const asOf = new Date("2026-07-10T12:00:00-03:00");
    await seriesForUser(10, { isActive: false });
    const created = await fulfillDueRecurrences(prisma, asOf);
    expect(created).toHaveLength(0);
  });

  it("clamps day 31 to the last day of a short month (February)", async () => {
    // 2026-02-28 is the last day; a series with dayOfMonth=31 fires then.
    const asOf = new Date("2026-02-28T12:00:00-03:00");
    await seriesForUser(31);
    const created = await fulfillDueRecurrences(prisma, asOf);
    expect(created).toHaveLength(1);
    expect(created[0]?.transactionDate.toISOString().slice(0, 10)).toBe(
      "2026-02-28",
    );
  });
});
