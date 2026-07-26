import type { FastifyInstance } from "fastify";
// apps/api/src/recurring-transactions/routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuthedUser } from "../../test/auth-helper.js";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";

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

async function authedUser() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET);
}

async function account(userId: string) {
  const inst = await server.prisma.institution.create({
    data: {
      name: "Nubank",
      compeCode: `260-${Math.random().toString(36).slice(2, 7)}`,
      logoAsset: "nubank.svg",
    },
  });
  return server.prisma.account.create({
    data: {
      userId,
      type: "checking",
      institutionId: inst.id,
      currency: "BRL",
      openingBalanceCents: 0,
      overdraftLimitCents: 0,
    },
  });
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

describe("recurring-transactions (US-3.9b)", () => {
  it("creates a series directly, without a prior transaction", async () => {
    const { userId, accessToken } = await authedUser();
    const acc = await account(userId);
    const res = await server.inject({
      method: "POST",
      url: "/v1/recurring-transactions",
      headers: auth(accessToken),
      payload: {
        description: "Aluguel apartamento novo",
        kind: "expense",
        accountId: acc.id,
        referenceAmountCents: 200_000,
        dayOfMonth: 10,
        startDate: "2026-09-01",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.dayOfMonth).toBe(10);
    expect(body.isActive).toBe(true);
    expect(body.referenceAmountBRLCents).toBe(200_000);
  });

  it("rejects a series that is both account and card", async () => {
    const { userId, accessToken } = await authedUser();
    const acc = await account(userId);
    const res = await server.inject({
      method: "POST",
      url: "/v1/recurring-transactions",
      headers: auth(accessToken),
      payload: {
        description: "x",
        kind: "expense",
        accountId: acc.id,
        creditCardId: "some-card",
        referenceAmountCents: 100,
        dayOfMonth: 1,
        startDate: "2026-09-01",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("pauses a series (isActive=false) and sets an endDate", async () => {
    const { userId, accessToken } = await authedUser();
    const acc = await account(userId);
    const created = await server.inject({
      method: "POST",
      url: "/v1/recurring-transactions",
      headers: auth(accessToken),
      payload: {
        description: "Netflix",
        kind: "expense",
        accountId: acc.id,
        referenceAmountCents: 5_590,
        dayOfMonth: 15,
        startDate: "2026-01-01",
      },
    });
    const id = created.json().id;
    const res = await server.inject({
      method: "PATCH",
      url: `/v1/recurring-transactions/${id}`,
      headers: auth(accessToken),
      payload: { isActive: false, endDate: "2026-12-31" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isActive).toBe(false);
    expect(res.json().endDate).toBe("2026-12-31");
  });

  it("deleting a series keeps past occurrences and unlinks them (no cascade)", async () => {
    const { userId, accessToken } = await authedUser();
    const acc = await account(userId);
    const series = await server.prisma.recurringTransaction.create({
      data: {
        userId,
        description: "Aluguel",
        kind: "expense",
        accountId: acc.id,
        referenceAmountCents: 150_000,
        referenceAmountBRLCents: 150_000,
        dayOfMonth: 5,
        startDate: new Date("2026-01-05"),
      },
    });
    const occurrence = await server.prisma.transaction.create({
      data: {
        userId,
        accountId: acc.id,
        kind: "expense",
        source: "manual",
        description: "Aluguel jan",
        transactionDate: new Date("2026-01-05"),
        amountCents: 150_000,
        amountBRLCents: 150_000,
        recurringTransactionId: series.id,
      },
    });
    const res = await server.inject({
      method: "DELETE",
      url: `/v1/recurring-transactions/${series.id}`,
      headers: auth(accessToken),
    });
    expect(res.statusCode).toBe(204);
    const still = await server.prisma.transaction.findUnique({
      where: { id: occurrence.id },
    });
    expect(still).not.toBeNull();
    expect(still?.recurringTransactionId).toBeNull();
  });
});
