// apps/web/src/routes/WaitlistPage.tsx
// BACKLOG.md US-8.1 — fila de acesso pública. A tela "de verdade" pertence
// à landing page (ARQUITETURA.md §6.0), que é o Épico 10 — explicitamente
// fora deste ciclo de trabalho. Esta é uma versão mínima standalone dentro
// do SPA, só para o endpoint ter um lugar clicável antes da landing existir;
// mover/reestilizar para a landing quando ela for construída.
import { Alert, Button, Input } from "@lurem/ui";
import { type FormEvent, useState } from "react";
import { ApiError, apiFetchJson } from "../auth/api-client";

export function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Honeypot — invisível via CSS, não com display:none (leitores de tela e
  // alguns bots ignoram display:none); um humano nunca vê nem preenche.
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetchJson("/access/waitlist", {
        method: "POST",
        body: JSON.stringify({ name, email, website: website || undefined }),
      });
      setSubmitted(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
        <Alert
          variant="success"
          title="Você está na fila"
          description="Avisaremos por e-mail quando seu acesso for liberado."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-xl font-bold text-[var(--lr-text)]">
        Pedir acesso ao Lurem
      </h1>
      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
        <Input
          label="Nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          type="email"
          label="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="website">Deixe em branco</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        {formError ? (
          <Alert variant="error" layout="inline" title={formError} />
        ) : null}
        <Button type="submit" loading={submitting}>
          Entrar na fila
        </Button>
      </form>
    </div>
  );
}
