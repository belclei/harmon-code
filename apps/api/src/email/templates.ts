// apps/api/src/email/templates.ts
import type { Resend } from "resend";
import { renderTemplate } from "./render-template.js";

async function send(
  resend: Resend,
  params: { to: string; subject: string; html: string; text: string },
): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: "Harmon <onboarding@harmon.fasolo.tech>",
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  if (error || !data) {
    throw new Error(`Resend send failed: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.id };
}

export function sendInviteEmail(
  resend: Resend,
  params: { to: string; link: string },
): Promise<{ id: string }> {
  return send(resend, {
    to: params.to,
    subject: "Seu convite para o Harmon chegou",
    html: renderTemplate("harmon-convite.html", { link: params.link }),
    text: renderTemplate("harmon-convite.txt", { link: params.link }),
  });
}

export function sendConnectionRequestEmail(
  resend: Resend,
  params: { to: string; requesterName: string; link: string },
): Promise<{ id: string }> {
  const vars = { requesterName: params.requesterName, link: params.link };
  return send(resend, {
    to: params.to,
    subject: "Pedido de conexão no Harmon",
    html: renderTemplate("harmon-conexao.html", vars),
    text: renderTemplate("harmon-conexao.txt", vars),
  });
}
