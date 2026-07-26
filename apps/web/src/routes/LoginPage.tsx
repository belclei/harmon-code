// apps/web/src/routes/LoginPage.tsx
import { Button, Input } from "@harmon/ui";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../auth/api-client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await login(email, password);
      await navigate({ to: "/accounts" });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.details?.length) {
          const next: Record<string, string> = {};
          for (const detail of error.details) {
            next[detail.field] = detail.message;
          }
          setFieldErrors(next);
        } else if (error.code === "auth.invalid_credentials") {
          setFormError("E-mail ou senha incorretos.");
        } else if (error.code === "auth.rate_limited") {
          setFormError("Muitas tentativas. Tente de novo em alguns minutos.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Não foi possível conectar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-xl font-bold text-[var(--hm-text)]">
        Entrar no Harmon
      </h1>
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <Input
          type="email"
          label="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          label="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
          autoComplete="current-password"
        />
        {formError ? (
          <p
            role="alert"
            className="text-sm text-[var(--hm-clay-600)] dark:text-[var(--hm-clay-300)]"
          >
            {formError}
          </p>
        ) : null}
        <Button type="submit" loading={submitting}>
          Entrar
        </Button>
      </form>
    </div>
  );
}
