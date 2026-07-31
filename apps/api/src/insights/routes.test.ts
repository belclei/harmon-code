import type { FastifyInstance } from "fastify";
// apps/api/src/insights/routes.test.ts
// BACKLOG.md US-3.10 — GET /v1/insights/dashboard: os 3 cards (cada um Money
// com breakdown, §3), cache Redis 60s invalidado por escrita (§5.6/§7.8).
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

// asOf fixo: torna a chave de cache estável entre chamadas e o cálculo
// determinístico (independente de "hoje"). Deve ser ≥ transactionDate das
// transações semeadas para que entrem no balance.
const AS_OF = "2026-07-25";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer(TEST_ENV);
});
afterEach(async () => {
  await resetTestDb(server.prisma);
  await server.redis.flushall();
});
afterAll(async () => {
  await server.close();
});

async function authedUser() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET);
}

async function checkingAccount(userId: string, openingBalanceCents: number) {
  return server.prisma.account.create({
    data: {
      userId,
      type: "checking",
      institutionId: null,
      currency: "BRL",
      openingBalanceCents,
      overdraftLimitCents: 0,
    },
  });
}

function getDashboard(token: string, asOf = AS_OF) {
  return server.inject({
    method: "GET",
    url: `/v1/insights/dashboard?asOf=${asOf}`,
    headers: { authorization: `Bearer ${token}` },
  });
}

function isBreakdownSumEqualToTotal(money: {
  valueCents: number;
  breakdown: Array<{ valueCents: number }>;
}): boolean {
  const sum = money.breakdown.reduce((acc, line) => acc + line.valueCents, 0);
  return sum === money.valueCents;
}

describe("GET /v1/insights/dashboard (US-3.10)", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/v1/insights/dashboard?asOf=${AS_OF}`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("auth.token_invalid");
  });

  it("returns the 3 cards, each a Money whose total equals the sum of its breakdown", async () => {
    const { userId, accessToken } = await authedUser();
    await checkingAccount(userId, 100_000);

    const res = await getDashboard(accessToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();

    for (const key of [
      "disponivelHoje",
      "previsaoFimDoMes",
      "patrimonioTotal",
    ]) {
      expect(body[key]).toBeDefined();
      expect(Array.isArray(body[key].breakdown)).toBe(true);
      expect(body[key].breakdown.length).toBeGreaterThan(0);
      expect(isBreakdownSumEqualToTotal(body[key])).toBe(true);
    }

    // Sem despesas/agendadas/recorrências, os três refletem o saldo líquido.
    expect(body.disponivelHoje.valueCents).toBe(100_000);
    expect(body.previsaoFimDoMes.valueCents).toBe(100_000);
    expect(body.patrimonioTotal.valueCents).toBe(100_000);
  });

  it("serves the second call within the TTL from cache (a write that bypasses the API is NOT reflected)", async () => {
    const { userId, accessToken } = await authedUser();
    const account = await checkingAccount(userId, 100_000);

    const first = await getDashboard(accessToken);
    expect(first.json().disponivelHoje.valueCents).toBe(100_000);

    // Escrita direta no banco (NÃO passa pela API → não incrementa a geração).
    await server.prisma.transaction.create({
      data: {
        userId,
        accountId: account.id,
        kind: "expense",
        source: "manual",
        description: "fora da API",
        transactionDate: new Date("2026-07-20"),
        currency: "BRL",
        amountCents: 25_000,
        amountBRLCents: 25_000,
        isScheduled: false,
      },
    });

    const second = await getDashboard(accessToken);
    // Ainda o valor antigo: veio do cache, não recomputou.
    expect(second.json().disponivelHoje.valueCents).toBe(100_000);
  });

  it("invalidates the cache after a write made through the API", async () => {
    const { userId, accessToken } = await authedUser();
    const account = await checkingAccount(userId, 100_000);

    // Preenche o cache.
    await getDashboard(accessToken);

    // Escrita direta (não invalida) só para provar que ela passa a contar
    // depois que a geração é incrementada pela escrita via API.
    await server.prisma.transaction.create({
      data: {
        userId,
        accountId: account.id,
        kind: "expense",
        source: "manual",
        description: "direta",
        transactionDate: new Date("2026-07-20"),
        currency: "BRL",
        amountCents: 25_000,
        amountBRLCents: 25_000,
        isScheduled: false,
      },
    });

    // Escrita via API: deve incrementar a geração e invalidar o cache.
    const write = await server.inject({
      method: "POST",
      url: "/v1/transactions",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        kind: "expense",
        accountId: account.id,
        description: "via API",
        transactionDate: "2026-07-21",
        amountCents: 5_000,
      },
    });
    expect(write.statusCode).toBe(201);

    const after = await getDashboard(accessToken);
    // Recomputado: 100_000 − 25_000 (direta) − 5_000 (via API) = 70_000.
    expect(after.json().disponivelHoje.valueCents).toBe(70_000);
  });
});
