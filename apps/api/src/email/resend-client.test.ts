import type { Resend } from "resend";
// apps/api/src/email/resend-client.test.ts
import { describe, expect, it, vi } from "vitest";
import { sendTestEmail } from "./resend-client.js";

// `sendTestEmail`'s `resend: Resend` parameter is dependency-injected, so a
// fake object shaped like the one part of the SDK we actually call
// (`emails.send`) is enough to exercise both branches without a live API
// key. `createResendClient` itself is a one-line `new Resend(apiKey)` wrap
// with no behavior of its own to verify without a live key — not tested here.
function fakeResend(send: (...args: unknown[]) => unknown): Resend {
  return { emails: { send } } as unknown as Resend;
}

describe("sendTestEmail", () => {
  it("returns the message id on a successful send", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_123" }, error: null });
    const resend = fakeResend(send);

    const result = await sendTestEmail(resend, "someone@example.com");

    expect(result).toEqual({ id: "email_123" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "someone@example.com" }),
    );
  });

  it("throws with the failure reason when Resend returns an error", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "some failure" } });
    const resend = fakeResend(send);

    await expect(sendTestEmail(resend, "someone@example.com")).rejects.toThrow(
      /some failure/,
    );
  });
});
