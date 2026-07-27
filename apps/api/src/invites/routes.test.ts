import type { FastifyInstance } from "fastify";
// apps/api/src/invites/routes.test.ts
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

async function authedUser() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET);
}

describe("POST /v1/invites", () => {
  it("creates an invite born awaiting_approval", async () => {
    const { accessToken } = await authedUser();

    const response = await server.inject({
      method: "POST",
      url: "/v1/invites",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { inviteeName: "Fulano", inviteeEmail: "fulano@example.com" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().status).toBe("awaiting_approval");
  });
});

describe("GET /v1/invites", () => {
  it("lists only my own invites with status", async () => {
    const { userId, accessToken } = await authedUser();
    const stranger = await authedUser();
    await server.prisma.invite.create({
      data: {
        inviterUserId: userId,
        inviteeName: "Mine",
        inviteeEmail: "mine@example.com",
      },
    });
    await server.prisma.invite.create({
      data: {
        inviterUserId: stranger.userId,
        inviteeName: "NotMine",
        inviteeEmail: "notmine@example.com",
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/invites",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body).toHaveLength(1);
    expect(body[0].inviteeName).toBe("Mine");
    expect(body[0].status).toBe("awaiting_approval");
  });
});
