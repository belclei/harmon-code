import type { FastifyInstance } from "fastify";
// apps/api/src/connections/routes.test.ts
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

async function authedUser(email?: string) {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET, { email });
}

describe("POST /v1/connections", () => {
  it("creates a pending connection to a known user by email", async () => {
    const a = await authedUser("a@harmon.dev");
    await authedUser("b@harmon.dev");

    const response = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().status).toBe("pending");
  });

  it("rejects an email that isn't a registered user", async () => {
    const a = await authedUser("a@harmon.dev");

    const response = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "ninguem@harmon.dev" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects connecting to yourself", async () => {
    const a = await authedUser("a@harmon.dev");

    const response = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "a@harmon.dev" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a duplicate connection between the same pair", async () => {
    const a = await authedUser("a@harmon.dev");
    await authedUser("b@harmon.dev");

    await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });
    const second = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });

    expect(second.statusCode).toBe(400);
  });
});

describe("POST /v1/connections/:id/accept", () => {
  it("only the addressee can accept, and both then see it as accepted", async () => {
    const a = await authedUser("a@harmon.dev");
    const b = await authedUser("b@harmon.dev");

    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });
    const id = created.json().id;

    const wrongAccept = await server.inject({
      method: "POST",
      url: `/v1/connections/${id}/accept`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });
    expect(wrongAccept.statusCode).toBe(404);

    const accept = await server.inject({
      method: "POST",
      url: `/v1/connections/${id}/accept`,
      headers: { authorization: `Bearer ${b.accessToken}` },
    });
    expect(accept.statusCode).toBe(200);
    expect(accept.json().status).toBe("accepted");

    const listA = await server.inject({
      method: "GET",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
    });
    const listB = await server.inject({
      method: "GET",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${b.accessToken}` },
    });
    expect(listA.json()[0].status).toBe("accepted");
    expect(listB.json()[0].status).toBe("accepted");
  });
});

describe("GET /v1/connections settlement balance", () => {
  it("sums unsettled portador transactions signed by kind", async () => {
    const a = await authedUser("a@harmon.dev");
    const b = await authedUser("b@harmon.dev");

    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });
    await server.inject({
      method: "POST",
      url: `/v1/connections/${created.json().id}/accept`,
      headers: { authorization: `Bearer ${b.accessToken}` },
    });

    const account = await server.prisma.account.create({
      data: { userId: a.userId, type: "cash" },
    });
    await server.prisma.transaction.create({
      data: {
        userId: a.userId,
        accountId: account.id,
        kind: "expense",
        description: "Pizza da Maria",
        transactionDate: new Date("2026-07-01"),
        amountCents: 5000,
        amountBRLCents: 5000,
        portadorUserId: b.userId,
      },
    });

    const list = await server.inject({
      method: "GET",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
    });

    expect(list.json()[0].settlementBalanceCents).toBe(5000);
  });
});
