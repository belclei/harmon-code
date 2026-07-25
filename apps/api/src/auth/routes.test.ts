// apps/api/src/auth/routes.test.ts
import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildServer } from "../server.js";
import { resetTestDb } from "../../test/db.js";
import { hashPassword } from "./password.js";
import type { FastifyInstance } from "fastify";

const TEST_ENV = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://harmon:harmon@localhost:5433/harmon",
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

describe("POST /v1/auth/login", () => {
  it("logs in with correct credentials and sets a refresh cookie", async () => {
    const passwordHash = await hashPassword("supersecret123");
    await server.prisma.user.create({
      data: {
        email: "login-test@harmon.dev",
        name: "Login Test",
        birthDate: new Date("1990-01-01"),
        passwordHash,
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "login-test@harmon.dev", password: "supersecret123" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toEqual(expect.any(String));
    expect(response.cookies.some((c) => c.name === "refreshToken")).toBe(true);
  });

  it("returns the same error for a wrong password and a nonexistent e-mail", async () => {
    const passwordHash = await hashPassword("supersecret123");
    await server.prisma.user.create({
      data: {
        email: "login-test2@harmon.dev",
        name: "Login Test",
        birthDate: new Date("1990-01-01"),
        passwordHash,
      },
    });

    const wrongPassword = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "login-test2@harmon.dev", password: "wrong" },
    });
    const noSuchUser = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "nobody@harmon.dev", password: "wrong" },
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(noSuchUser.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(noSuchUser.json());
  });

  it("rate-limits the 6th attempt within 15 minutes for the same e-mail", async () => {
    await server.redis.flushall();
    for (let i = 0; i < 5; i++) {
      await server.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "ratelimit@harmon.dev", password: "wrong" },
      });
    }
    const sixth = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "ratelimit@harmon.dev", password: "wrong" },
    });
    expect(sixth.statusCode).toBe(429);
    expect(sixth.json().code).toBe("auth.rate_limited");
  });

  it("keys the rate limiter per e-mail, not per IP — a different e-mail from the same client is unaffected", async () => {
    // Regression test: @fastify/rate-limit's default hook is 'onRequest',
    // which fires before the body is parsed, so a keyGenerator reading
    // request.body silently falls back to request.ip. All requests here
    // come from the same `server.inject` test client (same IP), so this
    // only passes if keying is genuinely e-mail-based (hook: 'preHandler').
    await server.redis.flushall();
    for (let i = 0; i < 5; i++) {
      await server.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "emailA@harmon.dev", password: "wrong" },
      });
    }
    const emailAExhausted = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "emailA@harmon.dev", password: "wrong" },
    });
    expect(emailAExhausted.statusCode).toBe(429);

    const emailBAttempt = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "emailB@harmon.dev", password: "wrong" },
    });
    expect(emailBAttempt.statusCode).toBe(401);
    expect(emailBAttempt.json().code).not.toBe("auth.rate_limited");
  });
});
