import type { ReactNode } from "react";
import { Badge } from "../Badge/Badge";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatDate } from "../shared/formatDate";
import { formatMoney } from "../shared/formatMoney";

export type TransactionKind = "income" | "expense" | "transfer";
export type TransactionSource = "manual" | "import";

interface TransactionRowCommon {
  description: string;
  /** ISO date string — formatted internally via `formatDate` (§7). */
  date: string;
  kind: TransactionKind;
  /** Always the positive magnitude — sign/color come from `kind`, never from the number itself. */
  amountCents: number;
  source: TransactionSource;
  categoryIcon?: ReactNode;
  categoryLabel?: string;
  onClick?: () => void;
}

export interface InstallmentDetail {
  originalAmountCents: number;
  originalDate: string;
  installmentNumber: number;
  installmentTotal: number;
  hasInterest: boolean;
  paidCount: number;
  paidAmountCents: number;
  remainingCount: number;
  remainingAmountCents: number;
  nextInstallmentDate: string;
  payoffDate: string;
}

export type TransactionRowProps =
  | (TransactionRowCommon & { variant: "default" })
  | (TransactionRowCommon & {
      variant: "transfer";
      /** e.g. "Conta Corrente → Poupança" destination label — already resolved by the caller, this component never looks up account names. */
      transferToLabel: string;
    })
  | (TransactionRowCommon & {
      variant: "installment";
      expanded?: boolean;
      installment: InstallmentDetail;
      onViewAllInstallments?: () => void;
      onEdit?: () => void;
    })
  | (TransactionRowCommon & {
      variant: "scheduled";
      onConfirm: () => void;
      onEdit: () => void;
      onSkip: () => void;
      onDelete: () => void;
    });

const KIND_TONE: Record<TransactionKind, "in" | "out" | "default"> = {
  income: "in",
  expense: "out",
  transfer: "default",
};

const KIND_SIGN: Record<TransactionKind, string> = {
  income: "+",
  expense: "-",
  transfer: "",
};

function RowHeader(props: TransactionRowProps) {
  return (
    <div className="flex items-center gap-3">
      {props.categoryIcon ? (
        <span
          aria-hidden="true"
          className="h-5 w-5 flex-none text-[var(--hm-text-2)]"
        >
          {props.categoryIcon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Body weight="medium" className="truncate">
            {props.description}
          </Body>
          {props.source === "import" ? (
            <Badge kind="status" status="pending">
              Importada
            </Badge>
          ) : null}
          {props.variant === "transfer" ? (
            <Badge kind="status" status="active">
              Transferência
            </Badge>
          ) : null}
        </div>
        <Body muted className="text-[.8125rem]">
          {props.categoryLabel ? `${props.categoryLabel} · ` : ""}
          {formatDate(props.date)}
          {props.variant === "transfer" ? ` · ${props.transferToLabel}` : ""}
        </Body>
      </div>
      <Mono variant="number" tone={KIND_TONE[props.kind]} className="flex-none">
        {KIND_SIGN[props.kind]}
        {formatMoney(props.amountCents)}
      </Mono>
    </div>
  );
}

function InstallmentDetails({
  installment,
}: { installment: InstallmentDetail }) {
  const segments = Array.from(
    { length: installment.installmentTotal },
    (_, i) => i < installment.paidCount,
  );

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-[var(--hm-border)] pt-3 text-[.8125rem]">
      <div className="flex justify-between">
        <Body as="span" muted>
          Compra original ({formatDate(installment.originalDate)})
        </Body>
        <Mono variant="number">
          {formatMoney(installment.originalAmountCents)}
        </Mono>
      </div>
      <Body as="span" muted>
        Plano: {installment.installmentTotal}x
        {installment.hasInterest ? " com juros" : " sem juros"}
      </Body>
      <div className="flex justify-between">
        <Body as="span" muted>
          Já pago ({installment.paidCount}x)
        </Body>
        <Mono variant="number" tone="in">
          {formatMoney(installment.paidAmountCents)}
        </Mono>
      </div>
      <div className="flex justify-between">
        <Body as="span" muted>
          A pagar ({installment.remainingCount}x)
        </Body>
        <Mono variant="number" tone="out">
          {formatMoney(installment.remainingAmountCents)}
        </Mono>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {segments.map((paid, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length progress segments, no identity beyond position
            key={i}
            className={[
              "h-1.5 flex-1 rounded-[var(--hm-r-full)]",
              paid
                ? "bg-[var(--hm-sage-600)] dark:bg-[var(--hm-sage-300)]"
                : "bg-[var(--hm-surface-sunken)]",
            ].join(" ")}
          />
        ))}
      </div>
      <Body as="span" muted>
        Próxima parcela: {formatDate(installment.nextInstallmentDate)} ·
        Quitação: {formatDate(installment.payoffDate)}
      </Body>
    </div>
  );
}

/**
 * Harmon's transaction line item. Dumb component: variant/fields all come
 * via props — it renders 5 shapes (manual/importada share the `default`
 * variant, distinguished only by the `source` tag) without deciding any
 * business state itself (§6.6, BACKLOG US-2.3).
 */
export function TransactionRow(props: TransactionRowProps) {
  const clickable = props.variant !== "scheduled" && Boolean(props.onClick);

  return (
    <Card
      interactive={clickable}
      onClick={clickable ? props.onClick : undefined}
      dashed={props.variant === "scheduled"}
    >
      <RowHeader {...props} />
      {props.variant === "installment" && props.expanded ? (
        <InstallmentDetails installment={props.installment} />
      ) : null}
      {props.variant === "installment" ? (
        <div className="mt-2 flex gap-3">
          {props.onViewAllInstallments ? (
            <button
              type="button"
              onClick={props.onViewAllInstallments}
              className="cursor-pointer border-0 bg-transparent p-0 text-[.8125rem] font-medium text-[var(--hm-blue-700)] hover:underline dark:text-[var(--hm-blue-300)]"
            >
              Ver todas as parcelas
            </button>
          ) : null}
          {props.onEdit ? (
            <button
              type="button"
              onClick={props.onEdit}
              className="cursor-pointer border-0 bg-transparent p-0 text-[.8125rem] font-medium text-[var(--hm-blue-700)] hover:underline dark:text-[var(--hm-blue-300)]"
            >
              Editar
            </button>
          ) : null}
        </div>
      ) : null}
      {props.variant === "scheduled" ? (
        <div className="mt-3 flex gap-2 border-t border-[var(--hm-border)] pt-3">
          <button
            type="button"
            onClick={props.onConfirm}
            className="cursor-pointer rounded-[var(--hm-r-sm)] bg-[var(--hm-sage-600)] px-3 py-1.5 text-[.8125rem] font-medium text-white hover:opacity-90"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={props.onEdit}
            className="cursor-pointer rounded-[var(--hm-r-sm)] border border-[var(--hm-border)] bg-transparent px-3 py-1.5 text-[.8125rem] font-medium text-[var(--hm-text)] hover:bg-[var(--hm-surface-sunken)]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={props.onSkip}
            className="cursor-pointer rounded-[var(--hm-r-sm)] border border-[var(--hm-border)] bg-transparent px-3 py-1.5 text-[.8125rem] font-medium text-[var(--hm-text)] hover:bg-[var(--hm-surface-sunken)]"
          >
            Pular
          </button>
          <button
            type="button"
            onClick={props.onDelete}
            className="cursor-pointer rounded-[var(--hm-r-sm)] border border-[var(--hm-border)] bg-transparent px-3 py-1.5 text-[.8125rem] font-medium text-[var(--hm-clay-650)] hover:bg-[var(--hm-clay-100)] dark:text-[var(--hm-clay-300)] dark:hover:bg-[var(--hm-clay-600)]/20"
          >
            Apagar
          </button>
        </div>
      ) : null}
    </Card>
  );
}
