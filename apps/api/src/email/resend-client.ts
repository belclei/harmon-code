// apps/api/src/email/resend-client.ts
import { Resend } from "resend";

export function createResendClient(apiKey: string): Resend {
  return new Resend(apiKey);
}

export async function sendTestEmail(
  resend: Resend,
  to: string,
): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: "Lurem <onboarding@lurem.fasolo.tech>",
    to,
    subject: "Harmon — e-mail de teste da infraestrutura Resend",
    text: "Se você recebeu este e-mail, o client Resend (US-1.12) está configurado corretamente.",
  });
  if (error || !data) {
    throw new Error(`Resend send failed: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.id };
}
