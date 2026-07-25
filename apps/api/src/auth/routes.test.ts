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

describe("POST /v1/auth/refresh", () => {
  it("rotates a valid refresh token and issues a new access token", async () => {
    const passwordHash = await hashPassword("supersecret123");
    await server.prisma.user.create({
      data: {
        email: "refresh-test@harmon.dev",
        name: "Refresh Test",
        birthDate: new Date("1990-01-01"),
        passwordHash,
      },
    });
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "refresh-test@harmon.dev", password: "supersecret123" },
    });
    const cookie = login.cookies.find((c) => c.name === "refreshToken");

    const refreshed = await server.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: { refreshToken: cookie!.value },
    });

    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().accessToken).toEqual(expect.any(String));
    expect(refreshed.cookies.some((c) => c.name === "refreshToken" && c.value !== cookie!.value)).toBe(
      true,
    );
  });

  it("rejects a reused refresh token", async () => {
    const passwordHash = await hashPassword("supersecret123");
    await server.prisma.user.create({
      data: {
        email: "reuse-test@harmon.dev",
        name: "Reuse Test",
        birthDate: new Date("1990-01-01"),
        passwordHash,
      },
    });
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "reuse-test@harmon.dev", password: "supersecret123" },
    });
    const cookie = login.cookies.find((c) => c.name === "refreshToken")!;

    await server.inject({ method: "POST", url: "/v1/auth/refresh", cookies: { refreshToken: cookie.value } });
    const reused = await server.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: { refreshToken: cookie.value },
    });
    // NOTE: the plan's brief snippet asserted 401 here, but AUTH_TOKEN_INVALID()
    // (errors.ts, matching IMPLEMENTACAO.md §7's `auth.token_invalid` catalog
    // entry) is documented and already implemented as 400, not 401. Asserting
    // the real, already-committed contract instead of the brief's stale
    // expectation — see task-7-report.md for detail.
    expect(reused.statusCode).toBe(400);
  });

  it("proves family-wide revocation: a never-replayed sibling token from the same family is also rejected after a reuse is detected", async () => {
    // Distinguishes "reject this one token" from "revoke the whole family":
    // rotate twice (gen0 -> gen1 -> gen2) so gen0, gen1, gen2 all share one
    // familyId. Replaying the already-consumed gen0 token is reuse and must
    // revoke the entire family — which must also invalidate gen2, even
    // though gen2 itself was never replayed. A buggy implementation that
    // only marks the reused *row* invalid (instead of revoking every row
    // sharing familyId) would let gen2 keep working; this test would catch
    // that.
    const passwordHash = await hashPassword("supersecret123");
    await server.prisma.user.create({
      data: {
        email: "family-reuse-test@harmon.dev",
        name: "Family Reuse Test",
        birthDate: new Date("1990-01-01"),
        passwordHash,
      },
    });
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "family-reuse-test@harmon.dev", password: "supersecret123" },
    });
    const gen0 = login.cookies.find((c) => c.name === "refreshToken")!.value;

    const rotate1 = await server.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: { refreshToken: gen0 },
    });
    const gen1 = rotate1.cookies.find((c) => c.name === "refreshToken")!.value;

    const rotate2 = await server.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: { refreshToken: gen1 },
    });
    const gen2 = rotate2.cookies.find((c) => c.name === "refreshToken")!.value;

    const replay = await server.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: { refreshToken: gen0 },
    });
    expect(replay.statusCode).toBe(400);

    const afterFamilyRevocation = await server.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: { refreshToken: gen2 },
    });
    expect(afterFamilyRevocation.statusCode).toBe(400);
  });
});

describe("POST /v1/auth/logout", () => {
  it("revokes the current refresh family", async () => {
    const passwordHash = await hashPassword("supersecret123");
    await server.prisma.user.create({
      data: {
        email: "logout-test@harmon.dev",
        name: "Logout Test",
        birthDate: new Date("1990-01-01"),
        passwordHash,
      },
    });
    const login = await server.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "logout-test@harmon.dev", password: "supersecret123" },
    });
    const cookie = login.cookies.find((c) => c.name === "refreshToken")!;
    const accessToken = login.json().accessToken;

    const logout = await server.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
      cookies: { refreshToken: cookie.value },
    });
    expect(logout.statusCode).toBe(200);

    const afterLogout = await server.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: { refreshToken: cookie.value },
    });
    // See note above: real AUTH_TOKEN_INVALID() status is 400, not the
    // brief's 401.
    expect(afterLogout.statusCode).toBe(400);
  });

  it("rejects logout without a valid access token", async () => {
    const noAuth = await server.inject({
      method: "POST",
      url: "/v1/auth/logout",
      cookies: { refreshToken: "irrelevant" },
    });
    expect(noAuth.statusCode).toBe(400);

    const badAuth = await server.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { authorization: "Bearer not-a-real-jwt" },
      cookies: { refreshToken: "irrelevant" },
    });
    expect(badAuth.statusCode).toBe(400);
  });
});
