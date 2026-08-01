// apps/web/src/routes/TimelinePage.tsx
// BACKLOG.md US-6.1 — a Timeline é a home real do app (§6.12, ver também
// ARQUITETURA.md §6.11 para o estado vazio/ativação, que chega na Sprint 7).
// TimelineAlertBanner e os totais do painel lateral derivam de /v1/accounts e
// /v1/cards (que já expõem isOverLimit/balanceCents/usedCents) — não existe
// endpoint próprio para eles (ver comentário em timeline/routes.ts no backend).
import {
  Alert,
  Badge,
  Body,
  Button,
  Calendar,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Input,
  Mono,
  ProfileIncompleteAlert,
  Segmented,
  Select,
  Skeleton,
  TimelineAlertBanner,
  TimelineEventRow,
  TransactionRow,
  formatMoney,
} from "@harmon/ui";
import type { AlertedEntity, CalendarRange, DomainEventType } from "@harmon/ui";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, apiFetchJson } from "../auth/api-client";
import type {
  AccountDto,
  CardDto,
  TimelinePageDto,
  TransactionDto,
  TxKind,
} from "../auth/types";
import { reaisToCentsOrZero, reaisToCentsPositive } from "../lib/money";

interface CategoryDto {
  id: string;
  name: string;
  kind: TxKind;
}

interface CreateTxPayload {
  kind: TxKind;
  description: string;
  transactionDate: string;
  amountCents: number;
  accountId?: string;
  creditCardId?: string;
  toAccountId?: string;
  toCreditCardId?: string;
  categoryId?: string;
}

// ARQUITETURA.md §6.12 item 3: a Timeline filtra por tipo de evento além de
// conta/cartão. `DomainEvent.type` tem 34 valores concretos (TimelineEventRow's
// catalog) — granular demais pra um filtro; agrupados nas mesmas famílias que
// TimelineEventRow já usa pra ícone (eventIcon()), então o rótulo do filtro e o
// ícone que o usuário vê na lista sempre concordam. "transaction" é o
// pseudo-tipo que GET /v1/timeline usa pra alternar as `Transaction` reais
// (que não são DomainEvent) — ver apps/api/src/timeline/routes.ts.
interface EventTypeGroup {
  id: string;
  label: string;
  types: string[];
}

const EVENT_TYPE_GROUPS: EventTypeGroup[] = [
  { id: "transaction", label: "Transações", types: ["transaction"] },
  {
    id: "account_card",
    label: "Contas e cartões",
    types: [
      "account.created",
      "account.updated",
      "account.balance_adjusted",
      "account.over_limit_entered",
      "account.over_limit_cleared",
      "card.created",
      "card.updated",
      "card.over_limit_entered",
      "card.over_limit_cleared",
      "card.invoice_closed",
      "card.invoice_due",
    ],
  },
  {
    id: "scheduled",
    label: "Agendadas",
    types: ["scheduled.confirmed", "scheduled.skipped", "scheduled.deleted"],
  },
  {
    id: "recurring",
    label: "Recorrências",
    types: ["recurring.created", "recurring.paused", "recurring.ended"],
  },
  { id: "import", label: "Importação", types: ["import.completed"] },
  {
    id: "connections",
    label: "Conexões e portador",
    types: [
      "invite.deleted",
      "invite.resent",
      "connection.requested",
      "connection.accepted",
      "connection.rejected",
      "connection.deleted",
      "connection.resent",
      "share.granted",
      "share.permission_changed",
      "share.revoked",
      "portador.assigned",
      "portador.accepted",
      "portador.rejected",
      "portador.settled",
    ],
  },
];

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function periodLabel(range: CalendarRange): string {
  if (!range.from) return "Período";
  if (!range.to) return shortDate(range.from);
  return `${shortDate(range.from)} – ${shortDate(range.to)}`;
}

function thisMonthRange(): CalendarRange {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

/** Compact trigger-button + floating panel — same open/blur-to-close idiom
 * already established by Select/AffixMenu, just without a search input
 * (index.html id="select"'s `.hmc-select` toolbar trigger has no combobox
 * behavior, unlike the form Select). Page-local: this isn't a new design
 * system primitive, just shared boilerplate between the 2 toolbar filters
 * below that need a popover instead of Select's full labeled input. */
function FilterPopover({
  label,
  triggerLabel,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  triggerLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="relative"
      ref={ref}
      onBlur={(event) => {
        if (!ref.current?.contains(event.relatedTarget as Node)) {
          onOpenChange(false);
        }
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        onClick={() => onOpenChange(!open)}
        className={[
          "flex items-center gap-2 rounded-[var(--hm-r-md)] border px-3.5 py-2 text-[.875rem]",
          "bg-[var(--hm-surface)] text-[var(--hm-text)] transition-colors duration-150",
          open
            ? "border-[var(--hm-ink-300)]"
            : "border-[var(--hm-border)] hover:border-[var(--hm-ink-300)]",
        ].join(" ")}
      >
        {triggerLabel}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={[
            "h-3.5 w-3.5 flex-none text-[var(--hm-text-2)] transition-transform duration-150",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1.5">{children}</div>
      ) : null}
    </div>
  );
}

function todayYmd(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

function NewTransactionDialog({
  open,
  onClose,
  accounts,
  cards,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  cards: CardDto[];
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<TxKind>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayYmd());
  const [sourceValue, setSourceValue] = useState<string | null>(null);
  const [destValue, setDestValue] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetchJson<CategoryDto[]>("/categories"),
  });

  const sourceOptions = useMemo(
    () => [
      ...accounts.map((a) => ({
        value: `acc:${a.id}`,
        label: `${a.institutionName}${a.name ? ` · ${a.name}` : ""}`,
      })),
      ...cards.map((c) => ({
        value: `card:${c.id}`,
        label: `Cartão ${c.institutionName}${c.name ? ` · ${c.name}` : ""}`,
      })),
    ],
    [accounts, cards],
  );

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? [])
        .filter((c) => kind === "transfer" || c.kind === kind)
        .map((c) => ({ value: c.id, label: c.name })),
    [categoriesQuery.data, kind],
  );

  function resolveTarget(value: string | null): {
    accountId?: string;
    creditCardId?: string;
  } {
    if (!value) return {};
    const [prefix, id] = value.split(":");
    return prefix === "acc" ? { accountId: id } : { creditCardId: id };
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateTxPayload) =>
      apiFetchJson<TransactionDto | TransactionDto[]>("/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setDescription("");
      setAmount("");
      setSourceValue(null);
      setDestValue(null);
      setCategoryId(null);
      setFormError(null);
      onCreated();
      onClose();
    },
    onError: (err: unknown) => {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar a transação.",
      );
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const cents = reaisToCentsPositive(amount);
    if (!description.trim()) {
      setFormError("Descreva a transação.");
      return;
    }
    if (cents === null) {
      setFormError("Informe um valor válido.");
      return;
    }
    if (!sourceValue) {
      setFormError("Escolha a conta ou o cartão.");
      return;
    }
    const source = resolveTarget(sourceValue);
    const base: CreateTxPayload = {
      kind,
      description: description.trim(),
      transactionDate: date,
      amountCents: cents,
      categoryId: categoryId ?? undefined,
    };
    if (kind === "transfer") {
      if (!source.accountId) {
        setFormError("A transferência sai de uma conta.");
        return;
      }
      if (!destValue) {
        setFormError("Escolha o destino da transferência.");
        return;
      }
      const dest = resolveTarget(destValue);
      createMutation.mutate({
        ...base,
        accountId: source.accountId,
        toAccountId: dest.accountId,
        toCreditCardId: dest.creditCardId,
      });
      return;
    }
    createMutation.mutate({ ...base, ...source });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nova transação">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Segmented
          label="Tipo"
          value={kind}
          onChange={(v) => setKind(v as TxKind)}
          options={[
            { value: "expense", label: "Despesa" },
            { value: "income", label: "Receita" },
            { value: "transfer", label: "Transferência" },
          ]}
        />
        <Input
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mercado, salário, aluguel…"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Valor"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            money
            affix="R$"
            inputMode="decimal"
            placeholder="0,00"
          />
          <Input
            label="Data"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            hint="AAAA-MM-DD"
          />
        </div>
        <Select
          label={kind === "transfer" ? "De (conta)" : "Conta ou cartão"}
          options={sourceOptions}
          value={sourceValue}
          onChange={setSourceValue}
          placeholder="Selecione…"
        />
        {kind === "transfer" ? (
          <Select
            label="Para (destino)"
            options={sourceOptions.filter((o) => o.value !== sourceValue)}
            value={destValue}
            onChange={setDestValue}
            placeholder="Selecione…"
          />
        ) : (
          <Select
            label="Categoria (opcional)"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Sem categoria"
          />
        )}
        {formError ? (
          <Alert variant="error" layout="inline" title={formError} />
        ) : null}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Registrar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

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
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [periodRange, setPeriodRange] = useState<CalendarRange>({});
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [periodOpen, setPeriodOpen] = useState(false);
  const [eventTypesOpen, setEventTypesOpen] = useState(false);
  const [hiddenEventGroupIds, setHiddenEventGroupIds] = useState<Set<string>>(
    new Set(),
  );
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const queryClient = useQueryClient();

  function toggleEventGroup(id: string) {
    setHiddenEventGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      // Never let every group be hidden at once — GET /v1/timeline treats an
      // empty `types` CSV the same as "no filter at all" (splitCsv collapses
      // `[]` back to `undefined`), so hiding the last visible group would
      // silently show everything instead of nothing.
      if (prev.size >= EVENT_TYPE_GROUPS.length - 1) return prev;
      next.add(id);
      return next;
    });
  }

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

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetchJson<CategoryDto[]>("/categories"),
    enabled: hasSession,
  });

  const eventTypesFilterActive = hiddenEventGroupIds.size > 0;
  const visibleEventTypes = eventTypesFilterActive
    ? EVENT_TYPE_GROUPS.filter((g) => !hiddenEventGroupIds.has(g.id)).flatMap(
        (g) => g.types,
      )
    : undefined;
  const eventTypesTriggerLabel = eventTypesFilterActive
    ? `Tipo de evento (${EVENT_TYPE_GROUPS.length - hiddenEventGroupIds.size}/${EVENT_TYPE_GROUPS.length})`
    : "Todos os tipos";
  const categoryFilterLabel = categoryFilterId
    ? ((categoriesQuery.data ?? []).find((c) => c.id === categoryFilterId)
        ?.name ?? "Categoria")
    : "Todas as categorias";

  const timelineQuery = useInfiniteQuery({
    queryKey: [
      "timeline",
      [...hiddenChipIds].sort(),
      visibleEventTypes,
      categoryFilterId,
      periodRange.from ? toYmd(periodRange.from) : null,
      periodRange.to ? toYmd(periodRange.to) : null,
    ],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      if (hasActiveFilter) {
        params.set("accountIds", visibleAccountIds.join(","));
        params.set("cardIds", visibleCardIds.join(","));
      }
      if (visibleEventTypes) params.set("types", visibleEventTypes.join(","));
      if (categoryFilterId) params.set("categoryId", categoryFilterId);
      if (periodRange.from) params.set("from", toYmd(periodRange.from));
      if (periodRange.to) params.set("to", toYmd(periodRange.to));
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
  const totalInvoicesCents = openInvoices.reduce(
    (sum, c) => sum + c.usedCents,
    0,
  );
  // §6.12 item 6's "patrimônio total" — no investments in the MVP schema yet
  // (PRODUCT.md), so ativos-passivos is just contas menos faturas em aberto.
  const netWorthCents = netBalanceCents - totalInvoicesCents;

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
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-[var(--hm-text)]">
              Timeline
            </h1>
            {/* Hidden during ativação (§6.11): sem conta/cartão cadastrado, os
                selects de destino do NewTransactionDialog ficam vazios e o
                usuário nunca consegue submeter o formulário — um beco sem
                saída em vez de um "+ Transação" utilizável. */}
            {pendingActivation.length === 0 ? (
              <Button onClick={() => setTxDialogOpen(true)}>+ Transação</Button>
            ) : null}
          </div>
          <NewTransactionDialog
            open={txDialogOpen}
            onClose={() => setTxDialogOpen(false)}
            accounts={accountsQuery.data ?? []}
            cards={cardsQuery.data ?? []}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["timeline"] });
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
            }}
          />

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
              <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-[var(--hm-border)] py-3">
                {chips.length > 0 ? (
                  <>
                    <span className="hm-label mr-1">Mostrar</span>
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
                  </>
                ) : null}

                <FilterPopover
                  label="Filtrar por período"
                  triggerLabel={periodLabel(periodRange)}
                  open={periodOpen}
                  onOpenChange={setPeriodOpen}
                >
                  <Calendar
                    label="Selecione o período"
                    mode="range"
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={periodRange}
                    onSelect={(value) => {
                      const range = value as CalendarRange;
                      setPeriodRange(range);
                      if (range.from && range.to) setPeriodOpen(false);
                    }}
                    footer={
                      <>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => {
                            setPeriodRange(thisMonthRange());
                            setPeriodOpen(false);
                          }}
                        >
                          Este mês
                        </Button>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => {
                            setPeriodRange({});
                            setPeriodOpen(false);
                          }}
                        >
                          Limpar
                        </Button>
                      </>
                    }
                  />
                </FilterPopover>

                <FilterPopover
                  label="Filtrar por tipo de evento"
                  triggerLabel={eventTypesTriggerLabel}
                  open={eventTypesOpen}
                  onOpenChange={setEventTypesOpen}
                >
                  <div className="flex w-64 flex-col gap-2.5 rounded-[var(--hm-r-md)] border border-[var(--hm-border)] bg-[var(--hm-surface)] p-3.5 shadow-[var(--hm-e2)]">
                    {EVENT_TYPE_GROUPS.map((group) => {
                      const checked = !hiddenEventGroupIds.has(group.id);
                      const isLastVisible =
                        checked &&
                        hiddenEventGroupIds.size >=
                          EVENT_TYPE_GROUPS.length - 1;
                      return (
                        <Checkbox
                          key={group.id}
                          label={group.label}
                          checked={checked}
                          disabled={isLastVisible}
                          onChange={() => toggleEventGroup(group.id)}
                        />
                      );
                    })}
                  </div>
                </FilterPopover>

                <FilterPopover
                  label="Filtrar por categoria"
                  triggerLabel={categoryFilterLabel}
                  open={categoryOpen}
                  onOpenChange={setCategoryOpen}
                >
                  <div className="flex w-56 flex-col overflow-hidden rounded-[var(--hm-r-md)] border border-[var(--hm-border)] bg-[var(--hm-surface)] py-1 shadow-[var(--hm-e2)]">
                    {[
                      {
                        id: null as string | null,
                        label: "Todas as categorias",
                      },
                      ...(categoriesQuery.data ?? []).map((c) => ({
                        id: c.id,
                        label: c.name,
                      })),
                    ].map((option) => (
                      <button
                        key={option.id ?? "__all__"}
                        type="button"
                        onClick={() => {
                          setCategoryFilterId(option.id);
                          setCategoryOpen(false);
                        }}
                        className={[
                          "px-3.5 py-2 text-left text-[.875rem]",
                          categoryFilterId === option.id
                            ? "bg-[var(--hm-blue-100)] font-bold text-[var(--hm-text)] dark:bg-[var(--hm-blue-700)]/30"
                            : "text-[var(--hm-text)] hover:bg-[var(--hm-surface-sunken)]",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </FilterPopover>
              </div>

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
          <Card>
            <p className="hm-label mb-1">Saldo líquido</p>
            <Mono
              variant="number"
              className="text-lg font-semibold text-[var(--hm-text)]"
            >
              {formatMoney(netBalanceCents)}
            </Mono>
            {/* §6.12 item 6 — quebra por conta/instituição sob o total. */}
            {(accountsQuery.data ?? []).length > 0 ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-[var(--hm-border)] pt-3">
                {(accountsQuery.data ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Body as="span" muted className="truncate text-[.8125rem]">
                      {a.name || a.institutionName}
                    </Body>
                    <Mono
                      variant="number"
                      className="flex-none text-[.8125rem]"
                    >
                      {formatMoney(a.balanceCents)}
                    </Mono>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-baseline justify-between">
              <Body as="span" muted>
                Faturas em aberto
              </Body>
              <Mono variant="number" tone="out" className="text-[.9375rem]">
                {totalInvoicesCents > 0 ? "− " : ""}
                {formatMoney(totalInvoicesCents)}
              </Mono>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-[var(--hm-border)] pt-3">
              <Body as="span" muted>
                Patrimônio total
              </Body>
              <Mono
                variant="number"
                tone={netWorthCents < 0 ? "out" : "default"}
                className="text-[.9375rem]"
              >
                {formatMoney(netWorthCents)}
              </Mono>
            </div>
            {openInvoices.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1 border-t border-[var(--hm-border)] pt-3">
                {openInvoices.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Body as="span" muted className="truncate text-[.8125rem]">
                      {c.name || c.institutionName}
                    </Body>
                    <Mono
                      variant="number"
                      tone="out"
                      className="flex-none text-[.8125rem]"
                    >
                      − {formatMoney(c.usedCents)}
                    </Mono>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

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
