import type { ReactNode } from "react";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatDate } from "../shared/formatDate";
import { formatMoney } from "../shared/formatMoney";

export type DomainEventType =
  | "account.created"
  | "account.updated"
  | "account.balance_adjusted"
  | "account.over_limit_entered"
  | "account.over_limit_cleared"
  | "card.created"
  | "card.updated"
  | "card.over_limit_entered"
  | "card.over_limit_cleared"
  | "card.invoice_closed"
  | "card.invoice_due"
  | "transaction.created"
  | "transaction.updated"
  | "transaction.deleted"
  | "scheduled.confirmed"
  | "scheduled.skipped"
  | "scheduled.deleted"
  | "recurring.created"
  | "recurring.paused"
  | "recurring.ended"
  | "import.completed"
  | "connection.requested"
  | "connection.accepted"
  | "connection.rejected"
  | "share.granted"
  | "share.permission_changed"
  | "share.revoked"
  | "portador.assigned"
  | "portador.accepted"
  | "portador.rejected"
  | "portador.settled";

/** Loosely-typed union of every field any catalog entry's copy needs — see Task 5's judgment-call note (mirrors `DomainEvent.payload: Json` in the Prisma schema). */
export interface DomainEventPayload {
  institutionName?: string;
  counterpartName?: string;
  changed?: string[];
  balanceCents?: number;
  overdraftLimitCents?: number;
  usedCents?: number;
  limitCents?: number;
  totalCents?: number;
  dueDate?: string;
  autoDebitAccountName?: string;
  count?: number;
  permission?: "view" | "edit";
  itemLabel?: string;
}

export interface TimelineEventRowProps {
  type: DomainEventType;
  payload: DomainEventPayload;
  /** ISO timestamp — formatted via `formatDate` (§7). */
  createdAt: string;
}

function pct(
  usedCents: number | undefined,
  limitCents: number | undefined,
): string {
  if (!usedCents || !limitCents) return "";
  return `${Math.round((usedCents / limitCents) * 100)}%`;
}

// One line of pt-BR copy per catalog entry (IMPLEMENTACAO.md §6). "Informação,
// não julgamento" tone throughout (ARQUITETURA.md, recurring theme) — never
// phrased as blame, even for `.rejected`/`.deleted` entries.
const EVENT_TEXT: Record<DomainEventType, (p: DomainEventPayload) => string> = {
  "account.created": (p) => `Conta ${p.institutionName ?? ""} criada`,
  "account.updated": (p) =>
    p.changed?.includes("overdraftLimitCents")
      ? `Limite de cheque especial de ${p.institutionName ?? "conta"} alterado`
      : `Conta ${p.institutionName ?? ""} atualizada`,
  "account.balance_adjusted": (p) =>
    `Saldo de ${p.institutionName ?? "conta"} ajustado manualmente`,
  "account.over_limit_entered": (p) =>
    `Conta ${p.institutionName ?? ""} entrou em alerta — ${formatMoney(p.balanceCents ?? 0)} além do limite`,
  "account.over_limit_cleared": (p) =>
    `Conta ${p.institutionName ?? ""} voltou para dentro do limite`,
  "card.created": (p) => `Cartão ${p.institutionName ?? ""} adicionado`,
  "card.updated": (p) => `Cartão ${p.institutionName ?? ""} atualizado`,
  "card.over_limit_entered": (p) =>
    `Cartão ${p.institutionName ?? ""} entrou em alerta — ${pct(p.usedCents, p.limitCents)} do limite`,
  "card.over_limit_cleared": (p) =>
    `Cartão ${p.institutionName ?? ""} voltou para dentro do limite`,
  "card.invoice_closed": (p) =>
    `Fatura ${p.institutionName ?? ""} fechou — ${formatMoney(p.totalCents ?? 0)}, vence em ${p.dueDate ? formatDate(p.dueDate) : "—"}`,
  "card.invoice_due": (p) =>
    `Fatura ${p.institutionName ?? ""} vence hoje — ${formatMoney(p.totalCents ?? 0)}${
      p.autoDebitAccountName
        ? ` (descontada automaticamente de ${p.autoDebitAccountName})`
        : ""
    }`,
  "transaction.created": () => "Transação registrada",
  "transaction.updated": () => "Transação corrigida",
  "transaction.deleted": () => "Transação removida",
  "scheduled.confirmed": () => "Transação agendada confirmada",
  "scheduled.skipped": () => "Ocorrência do mês pulada",
  "scheduled.deleted": () => "Série de agendamento encerrada",
  "recurring.created": () => "Nova recorrência cadastrada",
  "recurring.paused": () => "Recorrência pausada",
  "recurring.ended": () => "Recorrência encerrada",
  "import.completed": (p) =>
    `Fatura ${p.institutionName ?? ""} — ${p.count ?? 0} transações importadas`,
  "connection.requested": (p) =>
    `Convite de conexão enviado a ${p.counterpartName ?? ""}`,
  "connection.accepted": (p) => `Conexão com ${p.counterpartName ?? ""} aceita`,
  "connection.rejected": (p) =>
    `Conexão com ${p.counterpartName ?? ""} recusada`,
  "share.granted": (p) =>
    `${p.itemLabel ?? "Item"} compartilhado com ${p.counterpartName ?? ""} (${p.permission === "edit" ? "edição" : "visualização"})`,
  "share.permission_changed": (p) =>
    `Permissão de ${p.counterpartName ?? ""} em ${p.itemLabel ?? "item"} alterada`,
  "share.revoked": (p) =>
    `Compartilhamento de ${p.itemLabel ?? "item"} com ${p.counterpartName ?? ""} revogado`,
  "portador.assigned": (p) =>
    `Transação atribuída a ${p.counterpartName ?? ""}`,
  "portador.accepted": (p) =>
    `${p.counterpartName ?? ""} aceitou a transação atribuída`,
  "portador.rejected": (p) =>
    `${p.counterpartName ?? ""} rejeitou a transação atribuída`,
  "portador.settled": (p) => `Acerto com ${p.counterpartName ?? ""} registrado`,
};

// Category → icon mapping (line icons, viewBox 24×24, stroke 1.8 — Alert.tsx's
// established convention). One shared icon per event *family* (not per type)
// keeps this table readable — distinguishing copy carries the specifics —
// but each family below now gets its own icon pulled from an existing
// design-system glyph (brand/design-system/index.html), rather than the
// previous 2-icon catch-all that made ~24 of the 31 types visually
// indistinguishable from each other.
function eventIcon(type: DomainEventType): ReactNode {
  if (type.endsWith("over_limit_entered")) {
    return (
      <>
        <path d="M12 4 3 19h18z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    );
  }
  // Entering vs. leaving the alert state are opposite-meaning events — the
  // warning triangle above only ever fit "entered"; "cleared" gets the same
  // resolved/success checkmark Alert.tsx uses for its `success` variant.
  if (type.endsWith("over_limit_cleared")) {
    return (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    );
  }
  if (type.startsWith("card.invoice")) {
    return <path d="M4 7h16v10H4zM4 11h16" />;
  }
  // index.html "hmc-inst" — the institution glyph AccountCard/CreditCardCard
  // already show next to an account/card's own name.
  if (type.startsWith("account") || type.startsWith("card")) {
    return (
      <>
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M16 13h2" />
      </>
    );
  }
  // index.html nav item "Transações".
  if (type.startsWith("transaction")) {
    return <path d="M4 7h16M4 12h16M4 17h10" />;
  }
  // index.html nav item "Timeline" — the same clock glyph already tags an
  // "Agendada" TransactionRow/badge elsewhere in the reference.
  if (type.startsWith("scheduled")) {
    return (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    );
  }
  // index.html nav item "Recorrências".
  if (type.startsWith("recurring")) {
    return (
      <>
        <path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5" />
        <path d="M18 3v4h-4M6 21v-4h4" />
      </>
    );
  }
  if (type.startsWith("import")) {
    return <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />;
  }
  // connection.*/share.*/portador.*: the reference never draws a dedicated
  // icon for "another person" — it uses an avatar (hmc-avatar, initial +
  // color) instead, everywhere from the connections list to a portador
  // validation card. This row has no avatar slot (just icon+text+timestamp),
  // and inventing 3 icons with no design-system precedent would trade one
  // compliance problem for another — so these 10 types keep sharing a single
  // "connected people" glyph, at least now scoped to one coherent domain
  // instead of a meaningless catch-all shared with unrelated event types.
  return (
    <path d="M9 12a3 3 0 100-6 3 3 0 000 6zM15 18a3 3 0 100-6 3 3 0 000 6zM10.5 10.5l3 4" />
  );
}

/**
 * Harmon's generic structural timeline event line. Dumb component: reads a
 * `type` + loosely-typed `payload` and renders one of the catalog's 31
 * pt-BR copy templates (IMPLEMENTACAO.md §6, BACKLOG US-2.4) — never
 * decides which event happened.
 */
export function TimelineEventRow({
  type,
  payload,
  createdAt,
}: TimelineEventRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-[18px] w-[18px] flex-none text-[var(--hm-text-2)]"
      >
        {eventIcon(type)}
      </svg>
      <Body as="span" className="flex-1 text-[.875rem]">
        {EVENT_TEXT[type](payload)}
      </Body>
      <Mono
        variant="number"
        tone="default"
        className="flex-none text-[.75rem] text-[var(--hm-text-2)]"
      >
        {formatDate(createdAt)}
      </Mono>
    </div>
  );
}
