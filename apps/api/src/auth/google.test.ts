// apps/api/src/auth/google.test.ts
import { describe, expect, it, vi } from "vitest";

const verifyIdTokenMock = vi.fn();

vi.mock("google-auth-library", () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: verifyIdTokenMock,
    })),
  };
});

const { createGoogleIdTokenVerifier } = await import("./google.js");

const CLIENT_ID = "test-client-id";

function mockPayload(payload: Record<string, unknown> | undefined) {
  verifyIdTokenMock.mockResolvedValueOnce({
    getPayload: () => payload,
  });
}

describe("createGoogleIdTokenVerifier", () => {
  it("resolves the identity for a verified email", async () => {
    mockPayload({
      sub: "google-user-1",
      email: "verified@harmon.dev",
      name: "Verified User",
      email_verified: true,
    });

    const verify = createGoogleIdTokenVerifier(CLIENT_ID);
    const identity = await verify("fake-id-token");

    expect(identity).toEqual({
      googleId: "google-user-1",
      email: "verified@harmon.dev",
      name: "Verified User",
    });
  });

  it("rejects when the email is not verified", async () => {
    mockPayload({
      sub: "google-user-2",
      email: "unverified@harmon.dev",
      name: "Unverified User",
      email_verified: false,
    });

    const verify = createGoogleIdTokenVerifier(CLIENT_ID);
    await expect(verify("fake-id-token")).rejects.toThrow("Google id_token email not verified");
  });

  it("rejects when email_verified is missing entirely", async () => {
    mockPayload({
      sub: "google-user-3",
      email: "missing-flag@harmon.dev",
      name: "Missing Flag User",
    });

    const verify = createGoogleIdTokenVerifier(CLIENT_ID);
    await expect(verify("fake-id-token")).rejects.toThrow("Google id_token email not verified");
  });

  it("rejects when required claims are missing", async () => {
    mockPayload({
      sub: "google-user-4",
      email_verified: true,
    });

    const verify = createGoogleIdTokenVerifier(CLIENT_ID);
    await expect(verify("fake-id-token")).rejects.toThrow(
      "Google id_token missing required claims",
    );
  });
});
