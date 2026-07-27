import type { FastifyInstance } from "fastify";
// apps/api/src/usage/rollup.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";
import { computeDailyRollup } from "./rollup.js";

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

async function createUser(role: "user" | "admin" = "user") {
  return server.prisma.user.create({
    data: {
      email: `user-${Math.random().toString(36).slice(2)}@harmon.dev`,
      name: "Test",
      birthDate: new Date("1990-01-01"),
      role,
    },
  });
}

describe("computeDailyRollup", () => {
  it("counts distinct non-admin users active today as dau", async () => {
    const a = await createUser();
    const b = await createUser();
    const admin = await createUser("admin");
    const now = new Date("2026-07-20T15:00:00Z");
    await server.prisma.usageEvent.createMany({
      data: [
        { userId: a.id, name: "app_opened", properties: {}, createdAt: now },
        { userId: a.id, name: "app_opened", properties: {}, createdAt: now },
        { userId: b.id, name: "app_opened", properties: {}, createdAt: now },
        {
          userId: admin.id,
          name: "app_opened",
          properties: {},
          createdAt: now,
        },
      ],
    });

    const result = await computeDailyRollup(server.prisma, now);

    expect(result.metrics.dau).toBe(2);
    const stored = await server.prisma.usageDailyRollup.findFirst({
      where: { metric: "dau", dimension: "" },
    });
    expect(stored?.value).toBe(2);
  });

  it("wau/mau count distinct users over wider windows", async () => {
    const a = await createUser();
    const b = await createUser();
    const today = new Date("2026-07-20T12:00:00Z");
    const threeDaysAgo = new Date("2026-07-17T12:00:00Z");
    const twentyDaysAgo = new Date("2026-07-01T12:00:00Z"); // outside 7d, inside 30d
    await server.prisma.usageEvent.createMany({
      data: [
        {
          userId: a.id,
          name: "app_opened",
          properties: {},
          createdAt: today,
        },
        {
          userId: b.id,
          name: "app_opened",
          properties: {},
          createdAt: threeDaysAgo,
        },
        {
          userId: a.id,
          name: "app_opened",
          properties: {},
          createdAt: twentyDaysAgo,
        },
      ],
    });

    const result = await computeDailyRollup(server.prisma, today);

    expect(result.metrics.wau).toBe(2); // a (today) + b (3 days ago)
    expect(result.metrics.mau).toBe(2); // a + b, both within 30 days
  });

  it("computes D7 retention for a cohort that returned", async () => {
    const returning = await createUser();
    const churned = await createUser();
    const cohortDay = new Date("2026-07-13T10:00:00Z");
    const today = new Date("2026-07-20T10:00:00Z"); // exactly +7 days
    await server.prisma.usageEvent.createMany({
      data: [
        {
          userId: returning.id,
          name: "app_opened",
          properties: {},
          createdAt: cohortDay,
        },
        {
          userId: churned.id,
          name: "app_opened",
          properties: {},
          createdAt: cohortDay,
        },
        {
          userId: returning.id,
          name: "app_opened",
          properties: {},
          createdAt: today,
        },
      ],
    });

    const result = await computeDailyRollup(server.prisma, today);

    expect(result.metrics.retention_d7).toBe(50);
  });

  it("is idempotent — running twice for the same day doesn't duplicate rows", async () => {
    const now = new Date("2026-07-20T12:00:00Z");
    await computeDailyRollup(server.prisma, now);
    await computeDailyRollup(server.prisma, now);

    const count = await server.prisma.usageDailyRollup.count({
      where: { metric: "dau" },
    });
    expect(count).toBe(1);
  });
});
