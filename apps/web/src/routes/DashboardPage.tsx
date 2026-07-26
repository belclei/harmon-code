// apps/web/src/routes/DashboardPage.tsx
// US-3.11 — a rota /dashboard: busca os 3 cards em /v1/insights/dashboard e
// delega a renderização ao DashboardView (puro). Cuida dos estados §4.4:
// loading (skeleton sereno), error (acionável, com retry) e ready. Não há
// estado "empty" distinto — o endpoint sempre devolve os 3 cards (mesmo que
// zerados); a ativação (Timeline vazia, §6.11) é a Sprint 7, não esta tela.
import { Skeleton } from "@harmon/ui";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "../auth/AuthContext";
import { apiFetchJson } from "../auth/api-client";
import { type DashboardInsights, DashboardView } from "./DashboardView";

const NAV_LINK = "text-[var(--hm-text-2)] hover:underline";

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-40 w-full rounded-[var(--hm-r-lg)]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-[var(--hm-r-lg)]" />
        <Skeleton className="h-28 w-full rounded-[var(--hm-r-lg)]" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { isBooting, user } = useAuth();
  const hasSession = !isBooting && Boolean(user);

  const query = useQuery({
    queryKey: ["insights", "dashboard"],
    queryFn: () => apiFetchJson<DashboardInsights>("/insights/dashboard"),
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
        <span className="font-semibold text-[var(--hm-text)]">Dashboard</span>
        <Link to="/accounts" className={NAV_LINK}>
          Contas
        </Link>
        <Link to="/transactions" className={NAV_LINK}>
          Transações
        </Link>
        <Link to="/recurring" className={NAV_LINK}>
          Recorrências
        </Link>
        <Link to="/settings" className={NAV_LINK}>
          Configurações
        </Link>
      </nav>

      <h1 className="mb-6 text-xl font-bold text-[var(--hm-text)]">
        Seu dinheiro hoje
      </h1>

      {query.isLoading ? <DashboardSkeleton /> : null}
      {query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-[var(--hm-clay-600)] dark:text-[var(--hm-clay-300)]">
            Não foi possível carregar seus insights.
          </p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="text-sm font-semibold text-[var(--hm-text)] underline"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}
      {query.data ? <DashboardView insights={query.data} /> : null}
    </div>
  );
}
