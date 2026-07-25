// apps/api/src/email/webhook.test.ts
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
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
