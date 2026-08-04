import type { FastifyInstance } from "fastify";
// apps/api/src/categories/routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuthedUser } from "../../test/auth-helper.js";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";

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

async function authedUser() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET);
}

describe("GET /v1/categories", () => {
  it("returns system categories plus the caller's own, but not another user's", async () => {
    const { accessToken, userId } = await authedUser();
    const stranger = await authedUser();

    await server.prisma.category.create({
      data: {
        userId: null,
        name: "Salário",
        kind: "income",
        icon: "briefcase",
        colorToken: "--hm-sage-600",
        isSystem: true,
      },
    });
    await server.prisma.category.create({
      data: {
        userId,
        name: "Minha categoria",
        kind: "expense",
        icon: "star",
        colorToken: "--hm-blue-500",
      },
    });
    await server.prisma.category.create({
      data: {
        userId: stranger.userId,
        name: "Categoria de outro",
        kind: "expense",
        icon: "star",
        colorToken: "--hm-blue-500",
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/categories",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const names = response.json().map((c: { name: string }) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(["Salário", "Minha categoria"]),
    );
    expect(names).not.toContain("Categoria de outro");
  });
});

describe("POST /v1/categories", () => {
  it("creates a user category, never a system one", async () => {
    const { accessToken } = await authedUser();

    const response = await server.inject({
      method: "POST",
      url: "/v1/categories",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: "Pets",
        kind: "expense",
        icon: "dog",
        colorToken: "--hm-clay-500",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.isSystem).toBe(false);
  });
});

describe("DELETE /v1/categories/:id", () => {
  it("reassigns linked transactions to no-category instead of cascading", async () => {
    const { accessToken, userId } = await authedUser();
    const account = await server.prisma.account.create({
      data: { userId, type: "cash" },
    });
    const category = await server.prisma.category.create({
      data: {
        userId,
        name: "Descartável",
        kind: "expense",
        icon: "trash",
        colorToken: "--hm-clay-500",
      },
    });
    const transaction = await server.prisma.transaction.create({
      data: {
        userId,
        accountId: account.id,
        categoryId: category.id,
        kind: "expense",
        description: "Café",
        transactionDate: new Date("2026-01-10"),
        amountCents: 500,
        amountBRLCents: 500,
      },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/categories/${category.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const storedTx = await server.prisma.transaction.findUniqueOrThrow({
      where: { id: transaction.id },
    });
    expect(storedTx.categoryId).toBeNull();
    const storedCategory = await server.prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(storedCategory).toBeNull();
  });

  it("404s on a system category (read-only, not deletable via this route)", async () => {
    const { accessToken } = await authedUser();
    const systemCategory = await server.prisma.category.create({
      data: {
        userId: null,
        name: "Salário",
        kind: "income",
        icon: "briefcase",
        colorToken: "--hm-sage-600",
        isSystem: true,
      },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/categories/${systemCategory.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("404s on another user's category", async () => {
    const owner = await authedUser();
    const stranger = await authedUser();
    const category = await server.prisma.category.create({
      data: {
        userId: owner.userId,
        name: "Privada",
        kind: "expense",
        icon: "lock",
        colorToken: "--hm-clay-500",
      },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/categories/${category.id}`,
      headers: { authorization: `Bearer ${stranger.accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });
});
