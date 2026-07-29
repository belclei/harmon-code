import type { FastifyInstance } from "fastify";
// apps/api/src/invites/routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuthedUser } from "../../test/auth-helper.js";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

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

async function authedUser() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET);
}

async function authedAdmin() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET, { role: "admin" });
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

describe("DELETE /v1/invites/:id", () => {
  it("lets the inviter delete their own pending invite", async () => {
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(await server.prisma.invite.findUnique({ where: { id: invite.id } })).toBeNull();
  });

  it("lets an admin delete someone else's invite", async () => {
    const { userId } = await authedUser();
    const admin = await authedAdmin();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it("404s for a stranger who is neither the inviter nor an admin", async () => {
    const { userId } = await authedUser();
    const stranger = await authedUser();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${stranger.accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("blocks deleting an invite that already resulted in a registered account", async () => {
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: userId,
        inviteeName: "X",
        inviteeEmail: "x@example.com",
        status: "registered",
      },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("POST /v1/invites/:id/resend", () => {
  it("regenerates the token and sends the invite email for an approved invite", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: userId,
        inviteeName: "X",
        inviteeEmail: "x@example.com",
        status: "approved",
        registrationTokenHash: "old-hash",
        tokenExpiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/invites/${invite.id}/resend`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const stored = await server.prisma.invite.findUniqueOrThrow({ where: { id: invite.id } });
    expect(stored.registrationTokenHash).not.toBe("old-hash");
    expect(stored.tokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    expect(sendMock).toHaveBeenCalledTimes(1);
    // biome-ignore lint/style/noNonNullAssertion: toHaveBeenCalledTimes(1) above guarantees this call exists
    expect((sendMock.mock.calls[0]![0] as { to: string }).to).toBe("x@example.com");
  });

  it("blocks resending an invite that was never approved", async () => {
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/invites/${invite.id}/resend`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it("lets an admin resend someone else's approved invite", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
    const { userId } = await authedUser();
    const admin = await authedAdmin();
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: userId,
        inviteeName: "X",
        inviteeEmail: "x@example.com",
        status: "approved",
        registrationTokenHash: "old-hash",
        tokenExpiresAt: new Date(Date.now() + 1000),
      },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/invites/${invite.id}/resend`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
  });
});
