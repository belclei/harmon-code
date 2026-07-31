import type { FastifyInstance } from "fastify";
// apps/api/src/admin/routes.test.ts
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { resetTestDb } from "../../test/db.js";
import { signAccessToken } from "../auth/jwt.js";
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
beforeEach(() => {
  sendMock.mockClear();
  sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
});
afterEach(async () => {
  await resetTestDb(server.prisma);
});
afterAll(async () => {
  await server.close();
});

async function createUser(role: "user" | "admin", email?: string) {
  const user = await server.prisma.user.create({
    data: {
      email: email ?? `user-${Math.random().toString(36).slice(2)}@harmon.dev`,
      name: role === "admin" ? "Admin User" : "Plain User",
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

describe("/v1/admin/* — role gating", () => {
  it("a role=user token gets 403 admin.forbidden on any admin route", async () => {
    const { accessToken } = await createUser("user");

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/access",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("admin.forbidden");
  });

  it("a role=admin token can reach admin routes", async () => {
    const { accessToken } = await createUser("admin");

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/access",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe("GET /v1/admin/access", () => {
  it("lists pending waitlist entries and awaiting-approval invites", async () => {
    const admin = await createUser("admin");
    const requester = await createUser("user", "inviter@harmon.dev");
    await server.prisma.waitlistEntry.create({
      data: { name: "Fulano", email: "fulano@example.com" },
    });
    await server.prisma.invite.create({
      data: {
        inviterUserId: requester.userId,
        inviteeName: "Ciclana",
        inviteeEmail: "ciclana@example.com",
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/access",
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    const body = response.json();
    expect(body.waitlist).toHaveLength(1);
    expect(body.waitlist[0].email).toBe("fulano@example.com");
    expect(body.invites).toHaveLength(1);
    expect(body.invites[0].inviteeEmail).toBe("ciclana@example.com");
  });
});

describe("POST /v1/admin/access/waitlist/:id/approve", () => {
  it("generates a 7-day token and moves status to approved", async () => {
    const admin = await createUser("admin");
    const entry = await server.prisma.waitlistEntry.create({
      data: { name: "Fulano", email: "fulano@example.com" },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/access/waitlist/${entry.id}/approve`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const stored = await server.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(stored.status).toBe("approved");
    expect(stored.registrationTokenHash).not.toBeNull();
    expect(stored.approvedByUserId).toBe(admin.userId);
    expect(stored.tokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
  });

  it("sends the invite e-mail with a /register?token= link", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
    const admin = await createUser("admin");
    const entry = await server.prisma.waitlistEntry.create({
      data: { name: "Fulano", email: "fulano@example.com" },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/access/waitlist/${entry.id}/approve`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "fulano@example.com",
        subject: "Seu convite para o Harmon chegou",
        html: expect.stringContaining("/register?token="),
      }),
    );
  });

  it("keeps the approval when the Resend send fails — resend is a separate action, not a rollback", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });
    const admin = await createUser("admin");
    const entry = await server.prisma.waitlistEntry.create({
      data: { name: "Fulano", email: "fulano@example.com" },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/access/waitlist/${entry.id}/approve`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(500);
    const stored = await server.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(stored.status).toBe("approved");
    expect(stored.registrationTokenHash).not.toBeNull();
  });
});

describe("POST /v1/admin/access/invites/:id/approve", () => {
  it("generates a 7-day token, sends the invite email, and moves status to approved", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
    const admin = await createUser("admin");
    const requester = await createUser("user", "inviter@harmon.dev");
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: requester.userId,
        inviteeName: "Ciclana",
        inviteeEmail: "ciclana@example.com",
      },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/access/invites/${invite.id}/approve`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const stored = await server.prisma.invite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(stored.status).toBe("approved");
    expect(stored.registrationTokenHash).not.toBeNull();
    expect(stored.tokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());

    expect(sendMock).toHaveBeenCalledTimes(1);
    // biome-ignore lint/style/noNonNullAssertion: toHaveBeenCalledTimes(1) above guarantees this call exists
    const call = sendMock.mock.calls[0]![0] as { to: string; html: string };
    expect(call.to).toBe("ciclana@example.com");
    expect(call.html).toContain("/register?token=");
  });
});

describe("GET /v1/admin/users", () => {
  it("returns counts, never financial values", async () => {
    const admin = await createUser("admin");
    const plain = await createUser("user");
    const account = await server.prisma.account.create({
      data: { userId: plain.userId, type: "cash", openingBalanceCents: 99999 },
    });
    await server.prisma.transaction.create({
      data: {
        userId: plain.userId,
        accountId: account.id,
        kind: "expense",
        description: "Segredo",
        transactionDate: new Date("2026-07-01"),
        amountCents: 12345,
        amountBRLCents: 12345,
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/v1/admin/users",
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    const body = response.json();
    const plainUserRow = body.find(
      (u: { id: string }) => u.id === plain.userId,
    );
    expect(plainUserRow.accountCount).toBe(1);
    expect(plainUserRow.transactionCount).toBe(1);
    expect(JSON.stringify(body)).not.toMatch(/12345|99999/);
  });
});

describe("POST /v1/admin/users/:id/role", () => {
  it("promotes and demotes, generating a DomainEvent with actorUserId", async () => {
    const admin = await createUser("admin");
    const second = await createUser("admin");
    const plain = await createUser("user");

    const promote = await server.inject({
      method: "POST",
      url: `/v1/admin/users/${plain.userId}/role`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
      payload: { role: "admin" },
    });
    expect(promote.statusCode).toBe(200);
    expect(promote.json().role).toBe("admin");

    const event = await server.prisma.domainEvent.findFirst({
      where: { type: "admin.user_role_changed", aggregateId: plain.userId },
    });
    expect(event?.actorUserId).toBe(admin.userId);

    const demote = await server.inject({
      method: "POST",
      url: `/v1/admin/users/${plain.userId}/role`,
      headers: { authorization: `Bearer ${second.accessToken}` },
      payload: { role: "user" },
    });
    expect(demote.statusCode).toBe(200);
  });

  it("blocks demoting the last admin", async () => {
    const admin = await createUser("admin");

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/users/${admin.userId}/role`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
      payload: { role: "user" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe("admin.last_admin");
  });
});

describe("POST /v1/admin/users/:id/disable", () => {
  it("disables a plain user", async () => {
    const admin = await createUser("admin");
    const plain = await createUser("user");

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/users/${plain.userId}/disable`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
      payload: { disabled: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("disabled");
  });

  it("blocks disabling the last active admin", async () => {
    const admin = await createUser("admin");

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/users/${admin.userId}/disable`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
      payload: { disabled: true },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe("admin.last_admin");
  });
});

describe("POST /v1/admin/users/:id/beta", () => {
  it("toggles the beta-tester flag", async () => {
    const admin = await createUser("admin");
    const plain = await createUser("user");

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/users/${plain.userId}/beta`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
      payload: { isBetaTester: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().isBetaTester).toBe(true);
  });
});
