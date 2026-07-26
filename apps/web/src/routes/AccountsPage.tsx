// apps/web/src/routes/AccountsPage.tsx
import { AccountCard, CreditCardCard } from "@harmon/ui";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "../auth/AuthContext";
import { apiFetchJson } from "../auth/api-client";
import type { AccountDto, CardDto } from "../auth/types";

export function AccountsPage() {
  const { isBooting, user } = useAuth();
  const hasSession = !isBooting && Boolean(user);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetchJson<AccountDto[]>("/accounts"),
    enabled: hasSession,
  });
  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => apiFetchJson<CardDto[]>("/cards"),
    enabled: hasSession,
  });

  if (isBooting) {
    return <p className="p-6 text-[var(--hm-text-2)]">Carregando…</p>;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 flex gap-4 text-sm">
        <Link
          to="/dashboard"
          className="text-[var(--hm-text-2)] hover:underline"
        >
          Dashboard
        </Link>
        <span className="font-semibold text-[var(--hm-text)]">Contas</span>
        <Link
          to="/transactions"
          className="text-[var(--hm-text-2)] hover:underline"
        >
          Transações
        </Link>
        <Link
          to="/recurring"
          className="text-[var(--hm-text-2)] hover:underline"
        >
          Recorrências
        </Link>
      </nav>

      <h1 className="mb-6 text-xl font-bold text-[var(--hm-text)]">
        Contas e cartões
      </h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--hm-text-2)]">
          Contas
        </h2>
        {accountsQuery.isLoading ? (
          <p className="text-[var(--hm-text-2)]">Carregando…</p>
        ) : null}
        {accountsQuery.isError ? (
          <p
            role="alert"
            className="text-[var(--hm-clay-600)] dark:text-[var(--hm-clay-300)]"
          >
            Não foi possível carregar suas contas.
          </p>
        ) : null}
        {accountsQuery.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accountsQuery.data.map((account) => (
              <AccountCard
                key={account.id}
                institutionName={account.institutionName}
                logoUrl={account.logoUrl}
                name={account.name}
                type={account.type}
                balanceCents={account.balanceCents}
                isActive={account.isActive}
                overLimit={account.isOverLimit}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--hm-text-2)]">
          Cartões
        </h2>
        {cardsQuery.isLoading ? (
          <p className="text-[var(--hm-text-2)]">Carregando…</p>
        ) : null}
        {cardsQuery.isError ? (
          <p
            role="alert"
            className="text-[var(--hm-clay-600)] dark:text-[var(--hm-clay-300)]"
          >
            Não foi possível carregar seus cartões.
          </p>
        ) : null}
        {cardsQuery.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cardsQuery.data.map((card) => (
              <CreditCardCard
                key={card.id}
                institutionName={card.institutionName}
                logoUrl={card.logoUrl}
                name={card.name}
                usedCents={card.usedCents}
                limitCents={card.limitCents}
                invoiceStatus={card.invoiceStatus}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
