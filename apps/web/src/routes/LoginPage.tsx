// apps/web/src/routes/LoginPage.tsx
import { Button, Input } from "@harmon/ui";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, loginWithGoogle } from "../auth/api-client";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function describeAuthError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "auth.invalid_credentials") {
      return "E-mail ou senha incorretos.";
    }
    if (error.code === "auth.rate_limited") {
      return "Muitas tentativas. Tente de novo em alguns minutos.";
    }
    return error.message;
  }
  return "Não foi possível conectar. Tente novamente.";
}

export function LoginPage() {
  const { login, adoptSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Google Identity Services renders its own button into googleButtonRef —
  // loaded from Google's CDN rather than an npm package since GIS has no
  // supported one. No-op (button just never appears) when the client ID
  // isn't configured, e.g. a dev environment without .env set up.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setFormError(null);
          setSubmitting(true);
          try {
            const accessToken = await loginWithGoogle(response.credential);
            await adoptSession(accessToken);
            // Timeline is the real home (§6.12) — same destination as the
            // e-mail/password flow below.
            await navigate({ to: "/timeline" });
          } catch (error) {
            setFormError(describeAuthError(error));
          } finally {
            setSubmitting(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 335,
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [adoptSession, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await login(email, password);
      // Timeline is the real home (§6.12) — both the activation surface
      // when empty and the financial history when full; not /accounts.
      await navigate({ to: "/timeline" });
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) {
        const next: Record<string, string> = {};
        for (const detail of error.details) {
          next[detail.field] = detail.message;
        }
        setFieldErrors(next);
      } else {
        setFormError(describeAuthError(error));
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
      {GOOGLE_CLIENT_ID ? (
        <>
          <div ref={googleButtonRef} className="flex justify-center" />
          <div className="flex items-center gap-3">
            <hr className="flex-1 border-[var(--hm-border)]" />
            <span className="text-sm text-[var(--hm-text-2)]">ou</span>
            <hr className="flex-1 border-[var(--hm-border)]" />
          </div>
        </>
      ) : null}
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
