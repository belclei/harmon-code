import type { Resend } from "resend";
// apps/api/src/email/invite-email.test.ts
import { describe, expect, it, vi } from "vitest";
import { buildInviteEmail, sendInviteEmail } from "./invite-email.js";

function fakeResend(send: (...args: unknown[]) => unknown): Resend {
  return { emails: { send } } as unknown as Resend;
}

describe("buildInviteEmail", () => {
  it("mentions the inviter by name when this is a user-to-user invite", () => {
    const { subject, text } = buildInviteEmail({
      recipientName: "Ciclana",
      recipientEmail: "ciclana@example.com",
      registerUrl: "https://harmon.app/register?token=abc123",
      inviterName: "Fulano",
    });

    expect(subject).toBe("Seu acesso ao Harmon foi aprovado");
    expect(text).toContain("Fulano te convidou");
    expect(text).toContain("https://harmon.app/register?token=abc123");
  });

  it("skips the inviter mention for a waitlist approval", () => {
    const { text } = buildInviteEmail({
      recipientName: "Fulano",
      recipientEmail: "fulano@example.com",
      registerUrl: "https://harmon.app/register?token=xyz789",
    });

    expect(text).not.toContain("convidou");
    expect(text).toContain("Seu acesso ao Harmon acabou de ser aprovado.");
  });
});

describe("sendInviteEmail", () => {
  it("sends to the recipient with the built subject/text", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_123" }, error: null });
    const resend = fakeResend(send);

    const result = await sendInviteEmail(resend, {
      recipientName: "Fulano",
      recipientEmail: "fulano@example.com",
      registerUrl: "https://harmon.app/register?token=abc123",
    });

    expect(result).toEqual({ id: "email_123" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "fulano@example.com",
        subject: "Seu acesso ao Harmon foi aprovado",
      }),
    );
  });

  it("throws with the failure reason when Resend returns an error", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "some failure" } });
    const resend = fakeResend(send);

    await expect(
      sendInviteEmail(resend, {
        recipientName: "Fulano",
        recipientEmail: "fulano@example.com",
        registerUrl: "https://harmon.app/register?token=abc123",
      }),
    ).rejects.toThrow(/some failure/);
  });
});
