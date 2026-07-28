// apps/web/src/routes/TimelinePage.tsx
// BACKLOG.md US-6.1 — a Timeline é a home real do app (§6.12, ver também
// ARQUITETURA.md §6.11 para o estado vazio/ativação, que chega na Sprint 7).
// TimelineAlertBanner e os totais do painel lateral derivam de /v1/accounts e
// /v1/cards (que já expõem isOverLimit/balanceCents/usedCents) — não existe
// endpoint próprio para eles (ver comentário em timeline/routes.ts no backend).
import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Input,
  ProfileIncompleteAlert,
  Skeleton,
  TimelineAlertBanner,
  TimelineEventRow,
  TransactionRow,
} from "@harmon/ui";
import type { AlertedEntity, DomainEventType } from "@harmon/ui";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, apiFetchJson } from "../auth/api-client";
import type {
  AccountDto,
  CardDto,
  TimelinePageDto,
  TransactionDto,
} from "../auth/types";
import { reaisToCentsOrZero } from "../lib/money";

interface Chip {
  id: string;
  label: string;
}

interface ScheduledHandlers {
  onConfirm: (id: string) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
}

function transactionRowProps(tx: TransactionDto, scheduled: ScheduledHandlers) {
  const common = {
    description: tx.description,
    date: tx.transactionDate,
    kind: tx.kind,
    amountCents: tx.amountCents,
    source: tx.source,
    categoryLabel:
      tx.installmentTotal && tx.installmentNumber
        ? `Parcela ${tx.installmentNumber}/${tx.installmentTotal}`
        : undefined,
  };
  if (tx.isScheduled) {
    return (
      <TransactionRow
        key={tx.id}
        {...common}
        variant="scheduled"
        onConfirm={() => scheduled.onConfirm(tx.id)}
        onSkip={() => scheduled.onSkip(tx.id)}
        // Same as TransactionsPage (US-3.9) — inline editing from a row
        // isn't built anywhere yet, not a Timeline-specific gap.
        onEdit={() => {}}
        onDelete={() => scheduled.onDelete(tx.id)}
      />
    );
  }
  if (tx.kind === "transfer") {
    return (
      <TransactionRow
        key={tx.id}
        {...common}
        variant="transfer"
        transferToLabel={tx.transferDirection === "out" ? "Saída" : "Entrada"}
      />
    );
  }
  return <TransactionRow key={tx.id} {...common} variant="default" />;
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-32 rounded-[var(--hm-r-md)]" />
      <Skeleton className="h-16 w-full rounded-[var(--hm-r-lg)]" />
      <Skeleton className="h-16 w-full rounded-[var(--hm-r-lg)]" />
    </div>
  );
}

/** US-4.1's simplest case: no institution, so it's a small Dialog instead
 * of a trip to AccountsPage — a wallet is just an amount, not worth a
 * screen change for. Opened from the "Carteira" activation Alert below. */
function WalletDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (openingBalanceCents: number) =>
      apiFetchJson("/accounts", {
        method: "POST",
        body: JSON.stringify({ type: "cash", openingBalanceCents }),
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (error: unknown) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível registrar a carteira.",
      );
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const cents = reaisToCentsOrZero(amount);
    if (cents === null) {
      setFormError("Informe um valor válido.");
      return;
    }
    setFormError(null);
    createMutation.mutate(cents);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Carteira">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <p className="text-[.9375rem] text-[var(--hm-text-2)]">
          Quanto de dinheiro físico você tem hoje?
        </p>
        <Input
          money
          label="Valor"
          affix="R$"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {formError ? (
          <Alert variant="error" layout="inline" title={formError} />
        ) : null}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Adicionar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function TimelinePage() {
  const { isBooting, user } = useAuth();
  const navigate = useNavigate();
  const hasSession = !isBooting && Boolean(user);
  const [hiddenChipIds, setHiddenChipIds] = useState<Set<string>>(new Set());
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const invalidateTimeline = () =>
    queryClient.invalidateQueries({ queryKey: ["timeline"] });

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/transactions/${id}/confirm`, { method: "POST" }),
    onSuccess: () => {
      invalidateTimeline();
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
  const skipMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/transactions/${id}/skip`, { method: "POST" }),
    onSuccess: invalidateTimeline,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateTimeline();
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
  const scheduledHandlers: ScheduledHandlers = {
    onConfirm: (id) => confirmMutation.mutate(id),
    onSkip: (id) => skipMutation.mutate(id),
    onDelete: (id) => deleteMutation.mutate(id),
  };

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

  // US-4.1 — while any of the 3 items is missing, the Timeline shows
  // activation cards for just the missing ones instead of the feed (never a
  // linear wizard: each card is independent, any order, and the ones already
  // done simply aren't rendered). Only once all 3 exist does the real
  // day-grouped feed take over. Loading is treated as "not pending yet" —
  // rendering activation cards for a beat while accounts/cards are still in
  // flight would flash them for a returning user who already has data.
  const accountsLoaded = accountsQuery.isSuccess;
  const cardsLoaded = cardsQuery.isSuccess;
  const hasWallet = (accountsQuery.data ?? []).some((a) => a.type === "cash");
  const hasBankAccount = (accountsQuery.data ?? []).some(
    (a) => a.type !== "cash",
  );
  const hasCard = (cardsQuery.data ?? []).length > 0;
  const pendingActivation =
    accountsLoaded && cardsLoaded
      ? (
          [
            !hasWallet && "wallet",
            !hasBankAccount && "accounts",
            !hasCard && "cards",
          ] as const
        ).filter((v): v is "wallet" | "accounts" | "cards" => v !== false)
      : [];
  const activationDoneCount =
    accountsLoaded && cardsLoaded
      ? Number(hasWallet) + Number(hasBankAccount) + Number(hasCard)
      : 0;

  const chips: Chip[] = useMemo(
    () => [
      ...(accountsQuery.data ?? []).map((a) => ({
        id: a.id,
        label: a.name || a.institutionName,
      })),
      ...(cardsQuery.data ?? []).map((c) => ({
        id: c.id,
        label: c.name || c.institutionName,
      })),
    ],
    [accountsQuery.data, cardsQuery.data],
  );

  const visibleAccountIds = (accountsQuery.data ?? [])
    .map((a) => a.id)
    .filter((id) => !hiddenChipIds.has(id));
  const visibleCardIds = (cardsQuery.data ?? [])
    .map((c) => c.id)
    .filter((id) => !hiddenChipIds.has(id));
  const hasActiveFilter = hiddenChipIds.size > 0;

  const timelineQuery = useInfiniteQuery({
    queryKey: ["timeline", [...hiddenChipIds].sort()],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      if (hasActiveFilter) {
        params.set("accountIds", visibleAccountIds.join(","));
        params.set("cardIds", visibleCardIds.join(","));
      }
      const qs = params.toString();
      return apiFetchJson<TimelinePageDto>(`/timeline${qs ? `?${qs}` : ""}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: hasSession,
  });

  const alertedEntities: AlertedEntity[] = [
    ...(accountsQuery.data ?? [])
      .filter((a) => a.isOverLimit)
      .map(
        (a): AlertedEntity => ({
          id: a.id,
          kind: "account",
          institutionName: a.institutionName,
          overAmountCents: Math.abs(a.balanceCents) - a.overdraftLimitCents,
          onConfigure: () => {},
        }),
      ),
    ...(cardsQuery.data ?? [])
      .filter((c) => c.isOverLimit)
      .map(
        (c): AlertedEntity => ({
          id: c.id,
          kind: "card",
          institutionName: c.institutionName,
          usagePercent: (c.usedCents / c.limitCents) * 100,
          onConfigure: () => {},
        }),
      ),
  ];

  const netBalanceCents = (accountsQuery.data ?? []).reduce(
    (sum, a) => sum + a.balanceCents,
    0,
  );
  const openInvoices = (cardsQuery.data ?? []).filter((c) => c.usedCents > 0);

  if (isBooting) {
    return <p className="p-6 text-[var(--hm-text-2)]">Carregando…</p>;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }

  const days = timelineQuery.data?.pages.flatMap((page) => page.days) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {!user.hasCompleteProfile ? (
        <div className="mb-6">
          <ProfileIncompleteAlert
            onGoToSettings={() => navigate({ to: "/settings" })}
          />
        </div>
      ) : null}

      {alertedEntities.length > 0 ? (
        <div className="mb-6">
          <TimelineAlertBanner entities={alertedEntities} />
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div>
          <h1 className="mb-4 text-xl font-bold text-[var(--hm-text)]">
            Timeline
          </h1>

          {pendingActivation.length > 0 ? (
            <div>
              <p className="mb-4 text-sm text-[var(--hm-text-2)]">
                {activationDoneCount} de 3 concluídos
              </p>
              <div className="flex flex-col gap-3">
                {pendingActivation.includes("wallet") ? (
                  <Alert
                    variant="warning"
                    title="Carteira"
                    description="Quanto de dinheiro físico você tem hoje?"
                    actions={[
                      {
                        label: "Adicionar",
                        onClick: () => setWalletDialogOpen(true),
                      },
                    ]}
                  />
                ) : null}
                {pendingActivation.includes("accounts") ? (
                  <Alert
                    variant="warning"
                    title="Contas"
                    description="Adicione as contas de banco onde seu dinheiro vive — corrente ou poupança."
                    actions={[
                      {
                        label: "Adicionar contas",
                        onClick: () => navigate({ to: "/accounts" }),
                      },
                    ]}
                  />
                ) : null}
                {pendingActivation.includes("cards") ? (
                  <Alert
                    variant="warning"
                    title="Cartões"
                    description="Adicione seus cartões de crédito — limite, fechamento e vencimento."
                    actions={[
                      {
                        label: "Adicionar cartões",
                        onClick: () => navigate({ to: "/accounts" }),
                      },
                    ]}
                  />
                ) : null}
              </div>
              <WalletDialog
                open={walletDialogOpen}
                onClose={() => setWalletDialogOpen(false)}
                onCreated={() =>
                  queryClient.invalidateQueries({ queryKey: ["accounts"] })
                }
              />
            </div>
          ) : (
            <>
              {chips.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {chips.map((chip) => {
                    const hidden = hiddenChipIds.has(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() =>
                          setHiddenChipIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(chip.id)) next.delete(chip.id);
                            else next.add(chip.id);
                            return next;
                          })
                        }
                      >
                        <Badge
                          kind="status"
                          status={hidden ? "inactive" : "active"}
                        >
                          {chip.label}
                        </Badge>
                      </button>
                    );
                  })}
                  {hasActiveFilter ? (
                    <p className="text-xs text-[var(--hm-text-2)]">
                      {chips.length - hiddenChipIds.size} de {chips.length}{" "}
                      contas/cartões visíveis
                    </p>
                  ) : null}
                </div>
              ) : null}

              {timelineQuery.isLoading ? <TimelineSkeleton /> : null}
              {timelineQuery.isError ? (
                <p
                  role="alert"
                  className="text-[var(--hm-clay-600)] dark:text-[var(--hm-clay-300)]"
                >
                  Não foi possível carregar a timeline.
                </p>
              ) : null}
              {!timelineQuery.isLoading && days.length === 0 ? (
                <EmptyState
                  title="Nada por aqui ainda"
                  description="Suas contas, cartões e transações vão aparecer aqui conforme você usar o Harmon."
                />
              ) : null}

              <div className="flex flex-col gap-6">
                {days.map((day) => (
                  <section key={day.date}>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--hm-text-2)]">
                      {day.date}
                    </h2>
                    <div className="flex flex-col gap-2">
                      {day.items.map((item) =>
                        item.itemType === "transaction" ? (
                          transactionRowProps(
                            item.transaction,
                            scheduledHandlers,
                          )
                        ) : (
                          <TimelineEventRow
                            key={item.id}
                            // DomainEvent.type/payload are untyped String/Json
                            // at the DB boundary (§6 catalog) —
                            // TimelineEventRow owns the actual type union, so
                            // this cast is the API contract's boundary, not a
                            // real type escape.
                            type={item.type as DomainEventType}
                            payload={item.payload}
                            createdAt={item.createdAt}
                          />
                        ),
                      )}
                    </div>
                  </section>
                ))}
              </div>

              {timelineQuery.hasNextPage ? (
                <div className="mt-6">
                  <Button
                    variant="secondary"
                    loading={timelineQuery.isFetchingNextPage}
                    onClick={() => timelineQuery.fetchNextPage()}
                  >
                    Carregar mais
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--hm-r-lg)] border border-[var(--hm-border)] p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-[var(--hm-text-2)]">
              Saldo líquido
            </p>
            <p className="text-lg font-semibold text-[var(--hm-text)]">
              {(netBalanceCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          {openInvoices.length > 0 ? (
            <div className="rounded-[var(--hm-r-lg)] border border-[var(--hm-border)] p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--hm-text-2)]">
                Faturas em aberto
              </p>
              <ul className="flex flex-col gap-1 text-sm text-[var(--hm-text)]">
                {openInvoices.map((c) => (
                  <li key={c.id}>
                    {c.name || c.institutionName} —{" "}
                    {(c.usedCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Link
            to="/dashboard"
            className="text-sm text-[var(--hm-blue-700)] hover:underline"
          >
            Ver Disponível Hoje na Análise →
          </Link>
        </aside>
      </div>
    </div>
  );
}
