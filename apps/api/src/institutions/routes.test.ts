import type { FastifyInstance } from "fastify";
// apps/api/src/institutions/routes.test.ts
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

describe("GET /v1/institutions", () => {
  it("returns the active catalog, sorted by name, excluding inactive entries", async () => {
    const { accessToken } = await createAuthedUser(
      server.prisma,
      TEST_ENV.JWT_SECRET,
    );
    await server.prisma.institution.create({
      data: { name: "Zeta Bank", compeCode: "999-z", logoAsset: "zeta.svg" },
    });
    await server.prisma.institution.create({
      data: { name: "Alpha Bank", compeCode: "999-a", logoAsset: "alpha.svg" },
    });
    await server.prisma.institution.create({
      data: {
        name: "Inactive Bank",
        compeCode: "999-i",
        logoAsset: "inactive.svg",
        isActive: false,
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/institutions",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.map((i: { name: string }) => i.name)).toEqual([
      "Alpha Bank",
      "Zeta Bank",
    ]);
    expect(body.map((i: { logoUrl: string }) => i.logoUrl)).toEqual([
      "/alpha.svg",
      "/zeta.svg",
    ]);
  });

  it("requires authentication", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/v1/institutions",
    });
    expect(response.statusCode).toBe(400);
  });
});
