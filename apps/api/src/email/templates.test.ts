// apps/api/src/email/templates.test.ts
import type { Resend } from "resend";
import { describe, expect, it, vi } from "vitest";
import { sendConnectionRequestEmail, sendInviteEmail } from "./templates.js";

// Same dependency-injection pattern as resend-client.test.ts — a fake
// object shaped like the one SDK method we call, no live API key needed.
function fakeResend(send: (...args: unknown[]) => unknown): Resend {
  return { emails: { send } } as unknown as Resend;
}

describe("sendInviteEmail", () => {
  it("sends html+text with the invite link substituted", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_1" }, error: null });
    const resend = fakeResend(send);

    const result = await sendInviteEmail(resend, {
      to: "convidado@example.com",
      link: "https://harmon.fasolo.tech/register?token=xyz",
    });

    expect(result).toEqual({ id: "email_1" });
    const call = send.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(call.to).toBe("convidado@example.com");
    expect(call.subject).toBe("Seu convite para o Harmon chegou");
    expect(call.html).toContain(
      "https://harmon.fasolo.tech/register?token=xyz",
    );
    expect(call.text).toContain(
      "https://harmon.fasolo.tech/register?token=xyz",
    );
  });

  it("throws with the failure reason when Resend returns an error", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    const resend = fakeResend(send);

    await expect(
      sendInviteEmail(resend, { to: "x@example.com", link: "https://x" }),
    ).rejects.toThrow(/boom/);
  });
});

describe("sendConnectionRequestEmail", () => {
  it("sends html+text with requesterName and link substituted", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_2" }, error: null });
    const resend = fakeResend(send);

    const result = await sendConnectionRequestEmail(resend, {
      to: "addressee@example.com",
      requesterName: "Maria",
      link: "https://harmon.fasolo.tech/connections",
    });

    expect(result).toEqual({ id: "email_2" });
    const call = send.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(call.to).toBe("addressee@example.com");
    expect(call.subject).toBe("Pedido de conexão no Harmon");
    expect(call.html).toContain("Maria");
    expect(call.text).toContain("https://harmon.fasolo.tech/connections");
  });
});
