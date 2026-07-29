// apps/api/src/email/invite-email.ts
// BACKLOG.md §13 "E-mail de aprovação": aprovar uma entrada da fila/convite
// gerava o token de 7 dias mas nunca disparava o e-mail — a cópia (assunto,
// corpo, link) simplesmente não existia. Este módulo é essa cópia + o envio.
import type { Resend } from "resend";

export interface InviteEmailParams {
  recipientName: string;
  recipientEmail: string;
  /** Full /register?token=... URL — built by the caller from APP_BASE_URL, this module never assembles origins. */
  registerUrl: string;
  /** Who sent the user-to-user invite. Absent for waitlist entries (self-signup, no inviter). */
  inviterName?: string | null;
}

export function buildInviteEmail(params: InviteEmailParams): {
  subject: string;
  text: string;
} {
  const { recipientName, registerUrl, inviterName } = params;
  const subject = "Seu acesso ao Harmon foi aprovado";
  const intro = inviterName
    ? `${inviterName} te convidou para o Harmon, e seu acesso acabou de ser aprovado.`
    : "Seu acesso ao Harmon acabou de ser aprovado.";
  const text = [
    `Oi, ${recipientName}!`,
    "",
    intro,
    "Crie sua conta pelo link abaixo:",
    registerUrl,
    "",
    "Este link expira em 7 dias.",
    "",
    "— Equipe Harmon",
  ].join("\n");
  return { subject, text };
}

export async function sendInviteEmail(
  resend: Resend,
  params: InviteEmailParams,
): Promise<{ id: string }> {
  const { subject, text } = buildInviteEmail(params);
  const { data, error } = await resend.emails.send({
    from: "Harmon <onboarding@harmon.fasolo.tech>",
    to: params.recipientEmail,
    subject,
    text,
  });
  if (error || !data) {
    throw new Error(`Resend send failed: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.id };
}
