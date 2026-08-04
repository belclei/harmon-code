import type { FastifyInstance } from "fastify";
// apps/api/src/admin/usage-health-routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetTestDb } from "../../test/db.js";
import { signAccessToken } from "../auth/jwt.js";
import { buildServer } from "../server.js";
import { computeDailyRollup } from "../usage/rollup.js";

const TEST_ENV = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://lurem_test:lurem_test@localhost:5433/lurem_test",
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

async function createUser(role: "user" | "admin" = "user") {
  const user = await server.prisma.user.create({
    data: {
      email: `user-${Math.random().toString(36).slice(2)}@harmon.dev`,
      name: "Test",
      birthDate: new Date("1990-01-01"),
      role,
    },
  });
  const accessToken = await signAccessToken(
    { sub: user.id, role },
    TEST_ENV.JWT_SECRET,
  );
  return { userId: user.id, accessToken };
}

describe("GET /v1/admin/usage", () => {
  it("requires admin", async () => {
    const { accessToken } = await createUser("user");

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/usage",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it("reads DAU/WAU/MAU/retention from the rollup, never from raw UsageEvent", async () => {
    const admin = await createUser("admin");
    const active = await createUser("user");
    await server.prisma.usageEvent.create({
      data: {
        userId: active.userId,
        name: "app_opened",
        properties: {},
        createdAt: new Date(),
      },
    });
    await computeDailyRollup(server.prisma, new Date());

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/usage",
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dau).toBe(1);
    expect(body.retention).toEqual({ d1: 0, d7: 0, d30: 0 });
  });

  it("computes the activation funnel from real account/card data", async () => {
    const admin = await createUser("admin");
    const complete = await createUser("user");
    const partial = await createUser("user");
    const institution = await server.prisma.institution.create({
      data: { name: "Nubank", compeCode: "260-usage", logoAsset: "n.svg" },
    });
    await server.prisma.account.create({
      data: { userId: complete.userId, type: "cash" },
    });
    await server.prisma.account.create({
      data: {
        userId: complete.userId,
        type: "checking",
        institutionId: institution.id,
      },
    });
    await server.prisma.creditCard.create({
      data: {
        userId: complete.userId,
        institutionId: institution.id,
        limitCents: 1000,
        closingDay: 1,
        dueDay: 10,
      },
    });
    await server.prisma.account.create({
      data: { userId: partial.userId, type: "cash" },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/usage",
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    const body = response.json();
    expect(body.activationFunnel.wallet).toBe(2);
    expect(body.activationFunnel.accounts).toBe(1);
    expect(body.activationFunnel.cards).toBe(1);
    expect(body.activationFunnel.allThree).toBe(1);
  });
});

describe("GET /v1/admin/health", () => {
  it("requires admin", async () => {
    const { accessToken } = await createUser("user");

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/health",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it("reports real DB/Redis status and lists what isn't available, never a fabricated number", async () => {
    const admin = await createUser("admin");

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/health",
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.database).toBe("ok");
    expect(body.redis).toBe("ok");
    expect(body.notAvailable).toContain("deepSeekCostCents");
  });
});
