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
  WEB_APP_URL: "http://localhost:5173",
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

  // Bug report: a new series never showed up on the Timeline. Root cause —
  // TimelineEventRow/EVENT_TEXT (@lurem/ui) already has copy for
  // recurring.created/paused/ended, and GET /v1/timeline already reads
  // straight from DomainEvent, but this route never wrote one.
  it("emits a recurring.created DomainEvent on creation, so it shows up on the Timeline", async () => {
    const { userId, accessToken } = await authedUser();
    const acc = await account(userId);
    const created = await server.inject({
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
    const events = await server.prisma.domainEvent.findMany({
      where: { aggregateId: created.json().id, type: "recurring.created" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.userId).toBe(userId);
    expect(events[0]?.aggregateType).toBe("RecurringTransaction");
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

  it("emits recurring.paused when isActive flips to false, and recurring.ended when endDate is set", async () => {
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
    await server.inject({
      method: "PATCH",
      url: `/v1/recurring-transactions/${id}`,
      headers: auth(accessToken),
      payload: { isActive: false, endDate: "2026-12-31" },
    });
    const paused = await server.prisma.domainEvent.findMany({
      where: { aggregateId: id, type: "recurring.paused" },
    });
    const ended = await server.prisma.domainEvent.findMany({
      where: { aggregateId: id, type: "recurring.ended" },
    });
    expect(paused).toHaveLength(1);
    expect(paused[0]?.userId).toBe(userId);
    expect(ended).toHaveLength(1);
    expect(ended[0]?.userId).toBe(userId);
  });

  it("does not emit recurring.paused when isActive is set to true (resume has no catalog event)", async () => {
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
    await server.inject({
      method: "PATCH",
      url: `/v1/recurring-transactions/${id}`,
      headers: auth(accessToken),
      payload: { isActive: true },
    });
    const events = await server.prisma.domainEvent.findMany({
      where: {
        aggregateId: id,
        type: { in: ["recurring.paused", "recurring.ended"] },
      },
    });
    expect(events).toHaveLength(0);
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
