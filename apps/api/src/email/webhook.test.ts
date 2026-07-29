// apps/api/src/email/webhook.test.ts
import { createHmac } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../server.js";
import { verifyResendSignature } from "./webhook.js";

const SECRET = "whsec_test_secret";

function sign(
  rawBody: string,
  id: string,
  timestamp: string,
  secret: string,
): string {
  const sig = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  return `v1,${sig}`;
}

describe("verifyResendSignature", () => {
  it("accepts a correctly signed payload", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    const signature = sign(body, "msg_1", "1234567890", SECRET);
    expect(
      verifyResendSignature(
        body,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": signature,
        },
        SECRET,
      ),
    ).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    const signature = sign(body, "msg_1", "1234567890", "wrong_secret");
    expect(
      verifyResendSignature(
        body,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": signature,
        },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    const signature = sign(body, "msg_1", "1234567890", SECRET);
    const tamperedBody = JSON.stringify({ type: "email.bounced", data: {} });
    expect(
      verifyResendSignature(
        tamperedBody,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": signature,
        },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects when headers are missing", () => {
    expect(verifyResendSignature("{}", {}, SECRET)).toBe(false);
  });

  it("rejects when only svix-signature is missing", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    expect(
      verifyResendSignature(
        body,
        { "svix-id": "msg_1", "svix-timestamp": "1234567890" },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects when only svix-id is missing", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    const signature = sign(body, "msg_1", "1234567890", SECRET);
    expect(
      verifyResendSignature(
        body,
        { "svix-timestamp": "1234567890", "svix-signature": signature },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects when only svix-timestamp is missing", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    const signature = sign(body, "msg_1", "1234567890", SECRET);
    expect(
      verifyResendSignature(
        body,
        { "svix-id": "msg_1", "svix-signature": signature },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects a garbage/malformed signature value without throwing", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    expect(() =>
      verifyResendSignature(
        body,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": "not-a-valid-signature",
        },
        SECRET,
      ),
    ).not.toThrow();
    expect(
      verifyResendSignature(
        body,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": "not-a-valid-signature",
        },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects an empty-string signature header", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    expect(
      verifyResendSignature(
        body,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": "",
        },
        SECRET,
      ),
    ).toBe(false);
  });

  it("accepts when a valid signature is present alongside other unrelated/invalid ones (multi-value svix-signature)", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    const correct = sign(body, "msg_1", "1234567890", SECRET);
    const bogus = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    expect(
      verifyResendSignature(
        body,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": `${bogus} ${correct}`,
        },
        SECRET,
      ),
    ).toBe(true);
  });

  it("rejects when every value in a multi-value svix-signature header is wrong", () => {
    const body = JSON.stringify({ type: "email.delivered", data: {} });
    const bogus1 = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const bogus2 = sign(body, "msg_1", "1234567890", "wrong_secret");
    expect(
      verifyResendSignature(
        body,
        {
          "svix-id": "msg_1",
          "svix-timestamp": "1234567890",
          "svix-signature": `${bogus1} ${bogus2}`,
        },
        SECRET,
      ),
    ).toBe(false);
  });
});

describe("POST /v1/webhooks/resend (raw-body regression)", () => {
  const TEST_ENV = {
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgresql://harmon:harmon@localhost:5433/harmon",
    REDIS_URL: "redis://localhost:6379",
    JWT_SECRET: "x".repeat(32),
    GOOGLE_CLIENT_ID: "placeholder",
    RESEND_API_KEY: "placeholder",
    RESEND_WEBHOOK_SECRET: SECRET,
    WEB_APP_URL: "http://localhost:5173",
  PORT: 3001,
  };

  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer(TEST_ENV);
  });
  afterAll(async () => {
    await server.close();
  });

  it("accepts a signature computed over the true wire bytes, even when they don't survive JSON.parse -> JSON.stringify", async () => {
    // `1.50` is valid JSON but JSON.stringify(JSON.parse('1.50')) => `1.5` —
    // any handler that verifies against a re-serialization of request.body
    // (instead of the actual bytes Resend signed) will recompute a
    // different HMAC here and reject a 100% genuine, untampered delivery.
    // This must FAIL against the old `JSON.stringify(request.body)`
    // approach and PASS once verification uses the captured raw bytes.
    const rawBody = '{"type":"email.delivered","data":{"amount":1.50}}';
    const signature = sign(rawBody, "msg_1", "1234567890", SECRET);

    const response = await server.inject({
      method: "POST",
      url: "/v1/webhooks/resend",
      headers: {
        "content-type": "application/json",
        "svix-id": "msg_1",
        "svix-timestamp": "1234567890",
        "svix-signature": signature,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("rejects a request whose signature does not match the actual wire bytes", async () => {
    const rawBody = '{"type":"email.delivered","data":{"amount":1.50}}';
    // Signed over a *different*, re-serialized string, simulating exactly
    // the bug this test suite guards against.
    const wrongSignedString = JSON.stringify(JSON.parse(rawBody));
    const signature = sign(wrongSignedString, "msg_1", "1234567890", SECRET);

    const response = await server.inject({
      method: "POST",
      url: "/v1/webhooks/resend",
      headers: {
        "content-type": "application/json",
        "svix-id": "msg_1",
        "svix-timestamp": "1234567890",
        "svix-signature": signature,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(400);
  });
});
