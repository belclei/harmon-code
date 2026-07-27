// apps/api/src/settings/routes.test.ts
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuthedUser } from "../../test/auth-helper.js";
import { resetTestDb } from "../../test/db.js";
import { signAccessToken } from "../auth/jwt.js";
import { hashPassword } from "../auth/password.js";
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

describe("PATCH /v1/me", () => {
  it("updates name and birthDate", async () => {
    const { accessToken } = await authedUser();

    const response = await server.inject({
      method: "PATCH",
      url: "/v1/me",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Belclei Novo", birthDate: "1985-03-20" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe("Belclei Novo");
    expect(body.birthDate).toBe("1985-03-20");
  });

  it("rejects an unknown field (email is out of scope this sprint)", async () => {
    const { accessToken } = await authedUser();

    const response = await server.inject({
      method: "PATCH",
      url: "/v1/me",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: "novo@example.com" },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("PATCH /v1/me/theme", () => {
  it("persists the theme preference per user immediately", async () => {
    const { userId, accessToken } = await authedUser();

    const response = await server.inject({
      method: "PATCH",
      url: "/v1/me/theme",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { themePref: "dark" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().themePref).toBe("dark");

    const stored = await server.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(stored.themePref).toBe("dark");
  });
});

describe("PATCH /v1/me/avatar", () => {
  it("updates avatarMode and returns the resolved avatarUrls", async () => {
    const { userId, accessToken } = await authedUser();

    const response = await server.inject({
      method: "PATCH",
      url: "/v1/me/avatar",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { avatarMode: "dicebear" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().avatarMode).toBe("dicebear");
    expect(response.json().avatarUrls).toHaveLength(1);

    const user = await server.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(user.avatarMode).toBe("dicebear");
  });

  it("rejects avatarMode=google when the account has no googleId", async () => {
    const { accessToken } = await authedUser();

    const response = await server.inject({
      method: "PATCH",
      url: "/v1/me/avatar",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { avatarMode: "google" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe("settings.google_not_linked");
  });
});

describe("POST /v1/me/password", () => {
  async function authedUserWithPassword(plain: string) {
    const passwordHash = await hashPassword(plain);
    const user = await server.prisma.user.create({
      data: {
        email: `user-${Math.random().toString(36).slice(2)}@harmon.dev`,
        name: "Senha User",
        birthDate: new Date("1990-01-01"),
        passwordHash,
      },
    });
    const accessToken = await signAccessToken(
      { sub: user.id, role: "user" },
      TEST_ENV.JWT_SECRET,
    );
    return { userId: user.id, accessToken };
  }

  it("changes the password when the current password is correct", async () => {
    const { accessToken } = await authedUserWithPassword("senha-atual-123");

    const response = await server.inject({
      method: "POST",
      url: "/v1/me/password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: "senha-atual-123",
        newPassword: "nova-senha-456",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects without the correct current password", async () => {
    const { accessToken } = await authedUserWithPassword("senha-atual-123");

    const response = await server.inject({
      method: "POST",
      url: "/v1/me/password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: "errada", newPassword: "nova-senha-456" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("settings.wrong_password");
  });

  it("rejects a Google-only account (no passwordHash)", async () => {
    const { accessToken } = await authedUser();

    const response = await server.inject({
      method: "POST",
      url: "/v1/me/password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: "qualquer", newPassword: "nova-senha-456" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe("settings.password_not_set");
  });

  it("rejects a new password shorter than 8 chars", async () => {
    const { accessToken } = await authedUserWithPassword("senha-atual-123");

    const response = await server.inject({
      method: "POST",
      url: "/v1/me/password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: "senha-atual-123", newPassword: "curta" },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("POST /v1/me/delete", () => {
  it("rejects without the literal 'APAGAR' confirmation", async () => {
    const { accessToken } = await authedUser();

    const response = await server.inject({
      method: "POST",
      url: "/v1/me/delete",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmation: "apagar" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("settings.delete_confirmation_mismatch");
  });

  it("deletes accounts/cards/transactions/recurrences/connections and soft-deletes the user", async () => {
    const { userId, accessToken } = await authedUser();
    const other = await authedUser();

    const institution = await server.prisma.institution.create({
      data: { name: "Nubank", compeCode: "260-del", logoAsset: "nubank.svg" },
    });
    const account = await server.prisma.account.create({
      data: {
        userId,
        type: "checking",
        institutionId: institution.id,
        currency: "BRL",
        openingBalanceCents: 1000,
        overdraftLimitCents: 0,
        reconciledBalanceCents: 1000,
        reconciledAt: new Date(),
      },
    });
    await server.prisma.transaction.create({
      data: {
        userId,
        kind: "expense",
        source: "manual",
        description: "Café",
        transactionDate: new Date("2026-07-01"),
        accountId: account.id,
        currency: "BRL",
        amountCents: 500,
        amountBRLCents: 500,
        isScheduled: false,
      },
    });
    await server.prisma.recurringTransaction.create({
      data: {
        userId,
        description: "Aluguel",
        kind: "expense",
        accountId: account.id,
        referenceAmountCents: 100000,
        referenceAmountBRLCents: 100000,
        currency: "BRL",
        dayOfMonth: 5,
        startDate: new Date("2026-01-01"),
      },
    });
    await server.prisma.userConnection.create({
      data: { requesterUserId: userId, addresseeUserId: other.userId },
    });

    const response = await server.inject({
      method: "POST",
      url: "/v1/me/delete",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmation: "APAGAR" },
    });

    expect(response.statusCode).toBe(200);

    expect(await server.prisma.account.count({ where: { userId } })).toBe(0);
    expect(await server.prisma.transaction.count({ where: { userId } })).toBe(
      0,
    );
    expect(
      await server.prisma.recurringTransaction.count({ where: { userId } }),
    ).toBe(0);
    expect(
      await server.prisma.userConnection.count({
        where: {
          OR: [{ requesterUserId: userId }, { addresseeUserId: userId }],
        },
      }),
    ).toBe(0);

    const stored = await server.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(stored.status).toBe("disabled");
    expect(stored.deletedAt).not.toBeNull();
  });

  it("a soft-deleted user can no longer authenticate via /v1/me", async () => {
    const { userId, accessToken } = await authedUser();

    await server.inject({
      method: "POST",
      url: "/v1/me/delete",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { confirmation: "APAGAR" },
    });

    const meAfter = await server.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(meAfter.statusCode).toBe(400);
    void userId;
  });
});

describe("GET /v1/me/export", () => {
  it("returns the user's accounts, cards, transactions, recurring transactions, and connections as JSON", async () => {
    const { userId, accessToken } = await authedUser();
    const account = await server.prisma.account.create({
      data: { userId, type: "cash", currency: "BRL" },
    });
    await server.prisma.transaction.create({
      data: {
        userId,
        accountId: account.id,
        kind: "expense",
        description: "Mercado",
        transactionDate: new Date("2026-07-01"),
        amountCents: 5000,
        amountBRLCents: 5000,
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/me/export",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.transactions).toHaveLength(1);
    expect(body.cards).toEqual([]);
    expect(body.recurringTransactions).toEqual([]);
    expect(body.connections).toEqual([]);
    expect(typeof body.exportedAt).toBe("string");
  });

  it("requires authentication", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/v1/me/export",
    });
    expect(response.statusCode).toBe(400);
  });

  it("only returns the requesting user's own data", async () => {
    const { accessToken } = await authedUser();
    const other = await authedUser();
    await server.prisma.account.create({
      data: { userId: other.userId, type: "cash", currency: "BRL" },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/me/export",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.json().accounts).toEqual([]);
  });
});
