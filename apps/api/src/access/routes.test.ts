import type { FastifyInstance } from "fastify";
// apps/api/src/access/routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetTestDb } from "../../test/db.js";
import { hashToken } from "../auth/refresh-tokens.js";
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

describe("POST /v1/access/waitlist", () => {
  it("creates a pending entry and returns the neutral message", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/access/waitlist",
      payload: { name: "Fulano", email: "fulano@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toMatch(/fila/i);
    const stored = await server.prisma.waitlistEntry.findFirst({
      where: { email: "fulano@example.com" },
    });
    expect(stored?.status).toBe("pending");
  });

  it("returns the same neutral message for an already-queued email, without creating a duplicate", async () => {
    await server.prisma.waitlistEntry.create({
      data: { name: "Fulano", email: "fulano@example.com" },
    });

    const response = await server.inject({
      method: "POST",
      url: "/v1/access/waitlist",
      payload: { name: "Fulano", email: "fulano@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toMatch(/fila/i);
    const count = await server.prisma.waitlistEntry.count({
      where: { email: "fulano@example.com" },
    });
    expect(count).toBe(1);
  });

  it("returns the same neutral message for an already-registered email, without creating a waitlist row", async () => {
    await server.prisma.user.create({
      data: {
        email: "ja-existe@example.com",
        name: "Já Existe",
        birthDate: new Date("1990-01-01"),
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/v1/access/waitlist",
      payload: { name: "Já Existe", email: "ja-existe@example.com" },
    });

    expect(response.statusCode).toBe(200);
    const count = await server.prisma.waitlistEntry.count({
      where: { email: "ja-existe@example.com" },
    });
    expect(count).toBe(0);
  });

  it("silently discards a honeypot-filled submission", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/access/waitlist",
      payload: {
        name: "Bot",
        email: "bot@example.com",
        website: "http://spam.example",
      },
    });

    expect(response.statusCode).toBe(200);
    const count = await server.prisma.waitlistEntry.count({
      where: { email: "bot@example.com" },
    });
    expect(count).toBe(0);
  });
});

describe("GET /v1/auth/register/preview + POST /v1/auth/register", () => {
  async function approvedWaitlistToken() {
    const raw = "raw-waitlist-token";
    const entry = await server.prisma.waitlistEntry.create({
      data: {
        name: "Fulano",
        email: "fulano@example.com",
        status: "approved",
        registrationTokenHash: hashToken(raw),
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { raw, entry };
  }

  it("preview shows the locked e-mail for a valid waitlist token", async () => {
    const { raw } = await approvedWaitlistToken();

    const response = await server.inject({
      method: "GET",
      url: `/v1/auth/register/preview?token=${raw}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().email).toBe("fulano@example.com");
    expect(response.json().inviterName).toBeNull();
  });

  it("preview shows the inviter's name for a valid invite token", async () => {
    const inviter = await server.prisma.user.create({
      data: {
        email: "inviter@example.com",
        name: "Convidante",
        birthDate: new Date("1990-01-01"),
      },
    });
    const raw = "raw-invite-token";
    await server.prisma.invite.create({
      data: {
        inviterUserId: inviter.id,
        inviteeName: "Convidado",
        inviteeEmail: "convidado@example.com",
        status: "approved",
        registrationTokenHash: hashToken(raw),
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const response = await server.inject({
      method: "GET",
      url: `/v1/auth/register/preview?token=${raw}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().email).toBe("convidado@example.com");
    expect(response.json().inviterName).toBe("Convidante");
  });

  it("preview rejects an unknown token", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/v1/auth/register/preview?token=nao-existe",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("auth.token_invalid");
  });

  it("preview rejects an expired token", async () => {
    const raw = "expired-token";
    await server.prisma.waitlistEntry.create({
      data: {
        name: "Fulano",
        email: "expirado@example.com",
        status: "approved",
        registrationTokenHash: hashToken(raw),
        tokenExpiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await server.inject({
      method: "GET",
      url: `/v1/auth/register/preview?token=${raw}`,
    });

    expect(response.statusCode).toBe(410);
    expect(response.json().code).toBe("auth.token_expired");
  });

  it("completes registration, logs the user in, and marks the waitlist entry registered", async () => {
    const { raw, entry } = await approvedWaitlistToken();

    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        token: raw,
        name: "Fulano da Silva",
        birthDate: "1995-05-20",
        password: "senha-forte-123",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().accessToken).toEqual(expect.any(String));
    expect(response.cookies.some((c) => c.name === "refreshToken")).toBe(true);

    const user = await server.prisma.user.findUniqueOrThrow({
      where: { email: "fulano@example.com" },
    });
    expect(user.name).toBe("Fulano da Silva");
    expect(user.passwordHash).not.toBeNull();

    const stored = await server.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(stored.status).toBe("registered");
    expect(stored.registeredUserId).toBe(user.id);
  });

  it("rejects registering twice with the same token", async () => {
    const { raw } = await approvedWaitlistToken();
    await server.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        token: raw,
        name: "Fulano",
        birthDate: "1995-05-20",
        password: "senha-forte-123",
      },
    });

    const second = await server.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        token: raw,
        name: "Fulano de Novo",
        birthDate: "1995-05-20",
        password: "outra-senha-123",
      },
    });

    // Token já não está mais approved (virou registered) — inválido, não expirado.
    expect(second.statusCode).toBe(400);
    expect(second.json().code).toBe("auth.token_invalid");
  });
});
