// apps/web/src/routes/SettingsPage.tsx
// BACKLOG.md US-3.13 (dados pessoais/senha/tema) e US-3.14 (zona de risco).
// US-3.15 (exportação JSON/CSV) fica de fora — bloqueada por decisão de
// design pendente em ARQUITETURA.md §6.13 (ver BACKLOG.md ~linha 323).
import { Alert, Button, Dialog, Input, Switch } from "@harmon/ui";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, apiFetchJson, logout } from "../auth/api-client";

export function SettingsPage() {
  const { isBooting, user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSaved, setPersonalSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const personalMutation = useMutation({
    mutationFn: (body: { name?: string; birthDate?: string }) =>
      apiFetchJson("/me", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setPersonalError(null);
      setPersonalSaved(true);
      await refreshUser();
    },
    onError: (error: unknown) => {
      setPersonalSaved(false);
      setPersonalError(
        error instanceof ApiError ? error.message : "Não foi possível salvar.",
      );
    },
  });

  const themeMutation = useMutation({
    mutationFn: (themePref: "light" | "dark") =>
      apiFetchJson("/me/theme", {
        method: "PATCH",
        body: JSON.stringify({ themePref }),
      }),
    onSuccess: async () => {
      await refreshUser();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiFetchJson("/me/password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setPasswordError(null);
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: unknown) => {
      setPasswordSaved(false);
      setPasswordError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível trocar a senha.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (confirmation: string) =>
      apiFetchJson("/me/delete", {
        method: "POST",
        body: JSON.stringify({ confirmation }),
      }),
    onSuccess: async () => {
      await logout();
      window.location.assign("/login");
    },
    onError: (error: unknown) => {
      setDeleteError(
        error instanceof ApiError ? error.message : "Não foi possível apagar.",
      );
    },
  });

  if (isBooting) {
    return <p className="p-6 text-[var(--hm-text-2)]">Carregando…</p>;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }

  function submitPersonal(event: FormEvent) {
    event.preventDefault();
    setPersonalSaved(false);
    personalMutation.mutate({ name, birthDate });
  }

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação não bate com a nova senha.");
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  }

  function submitDelete(event: FormEvent) {
    event.preventDefault();
    setDeleteError(null);
    deleteMutation.mutate(deleteConfirmation);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <nav className="mb-6 flex gap-4 text-sm">
        <Link
          to="/timeline"
          className="text-[var(--hm-text-2)] hover:underline"
        >
          Timeline
        </Link>
        <Link
          to="/dashboard"
          className="text-[var(--hm-text-2)] hover:underline"
        >
          Dashboard
        </Link>
        <Link
          to="/accounts"
          className="text-[var(--hm-text-2)] hover:underline"
        >
          Contas
        </Link>
        <Link
          to="/connections"
          className="text-[var(--hm-text-2)] hover:underline"
        >
          Conexões
        </Link>
        <span className="font-semibold text-[var(--hm-text)]">
          Configurações
        </span>
      </nav>

      <h1 className="mb-6 text-xl font-bold text-[var(--hm-text)]">
        Configurações
      </h1>

      <section className="mb-8" aria-labelledby="dados-pessoais">
        <h2
          id="dados-pessoais"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--hm-text-2)]"
        >
          Dados pessoais
        </h2>
        <form onSubmit={submitPersonal} className="flex flex-col gap-3">
          <Input
            label="Nome completo"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            type="text"
            label="Data de nascimento"
            hint="AAAA-MM-DD"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <Input label="E-mail" value={user.email} disabled />
          {personalError ? (
            <Alert variant="error" layout="inline" title={personalError} />
          ) : null}
          {personalSaved && !personalError ? (
            <Alert variant="success" layout="inline" title="Dados salvos." />
          ) : null}
          <div>
            <Button type="submit" loading={personalMutation.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </section>

      <section className="mb-8" aria-labelledby="aparencia">
        <h2
          id="aparencia"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--hm-text-2)]"
        >
          Aparência
        </h2>
        <Switch
          label="Tema escuro"
          checked={user.themePref === "dark"}
          disabled={themeMutation.isPending}
          onChange={(checked) =>
            themeMutation.mutate(checked ? "dark" : "light")
          }
        />
      </section>

      {user.hasPassword ? (
        <section className="mb-8" aria-labelledby="senha">
          <h2
            id="senha"
            className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--hm-text-2)]"
          >
            Senha
          </h2>
          <form onSubmit={submitPassword} className="flex flex-col gap-3">
            <Input
              type="password"
              label="Senha atual"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <Input
              type="password"
              label="Nova senha"
              hint="Mínimo de 8 caracteres."
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Input
              type="password"
              label="Confirmar nova senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {passwordError ? (
              <Alert variant="error" layout="inline" title={passwordError} />
            ) : null}
            {passwordSaved && !passwordError ? (
              <Alert
                variant="success"
                layout="inline"
                title="Senha atualizada."
              />
            ) : null}
            <div>
              <Button type="submit" loading={passwordMutation.isPending}>
                Trocar senha
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section aria-labelledby="zona-de-risco">
        <h2
          id="zona-de-risco"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--hm-clay-600)] dark:text-[var(--hm-clay-300)]"
        >
          Zona de risco
        </h2>
        <Alert
          variant="warning"
          title="Apagar conta"
          description="Remove suas contas, cartões, transações, recorrências e conexões do banco de dados imediatamente. Cópias em backup seguem a política normal de retenção (7 diários, 4 semanais, 6 mensais) — não é uma exclusão instantânea das cópias de segurança."
          actions={[
            {
              label: "Apagar conta",
              onClick: () => setDeleteOpen(true),
            },
          ]}
        />
      </section>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteConfirmation("");
          setDeleteError(null);
        }}
        title="Apagar conta"
        description='Esta ação não pode ser desfeita nos dados vivos. Digite "APAGAR" para confirmar.'
      >
        <form onSubmit={submitDelete} className="flex flex-col gap-3">
          <Input
            label="Confirmação"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
          />
          {deleteError ? (
            <Alert variant="error" layout="inline" title={deleteError} />
          ) : null}
          <div className="mt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={deleteMutation.isPending}
              disabled={deleteConfirmation !== "APAGAR"}
            >
              Apagar conta
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
