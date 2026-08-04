import type { ReactNode } from "react";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatDate } from "../shared/formatDate";
import { formatMoney } from "../shared/formatMoney";

export type StagingReviewStatus = "pending" | "confirmed" | "rejected";

export interface StagingReviewRowProps {
  description: string;
  amountCents: number;
  date: string;
  /** 1–3 discrete pips, never a percentage (§6.8). */
  confidencePips: 1 | 2 | 3;
  suggestedCategoryLabel?: string;
  suggestedCategoryIcon?: ReactNode;
  status: StagingReviewStatus;
  isDuplicate?: boolean;
  duplicateReason?: string;
  suggestsRecurringLink?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
}

function ConfidencePips({ pips }: { pips: 1 | 2 | 3 }) {
  return (
    <span
      role="img"
      aria-label={`Confiança: ${pips} de 3`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={[
            "h-1.5 w-1.5 rounded-full",
            // REBRAND (Task 1.3): blue-700/300 -> petrol-700/300, per the
            // task-1.3 brief's explicit classification of this "filled"
            // confidence-pip indicator alongside other selection-state uses.
            i <= pips
              ? "bg-[var(--lr-petrol-700)] dark:bg-[var(--lr-petrol-300)]"
              : "bg-[var(--lr-surface-sunken)]",
          ].join(" ")}
        />
      ))}
    </span>
  );
}

/**
 * Lurem's import-review line item. Dumb component: `confidencePips` and
 * `status` arrive via props — no extraction/confidence scoring happens here
 * (§6.8, BACKLOG US-2.5). "Alta confiança" styling is `confidencePips === 3`,
 * a read of the same prop, not a separate decision.
 */
export function StagingReviewRow({
  description,
  amountCents,
  date,
  confidencePips,
  suggestedCategoryLabel,
  suggestedCategoryIcon,
  status,
  isDuplicate = false,
  duplicateReason,
  suggestsRecurringLink = false,
  onConfirm,
  onEdit,
  onReject,
}: StagingReviewRowProps) {
  const isHighConfidence = confidencePips === 3;

  return (
    <Card dashed={status === "rejected"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Body weight="medium" className="truncate">
              {description}
            </Body>
            <ConfidencePips pips={confidencePips} />
            {isHighConfidence ? (
              <Badge kind="status" status="active">
                Alta confiança
              </Badge>
            ) : null}
            {isDuplicate ? (
              <Badge kind="status" status="alert">
                Possível duplicata
              </Badge>
            ) : null}
            {suggestsRecurringLink ? (
              <Badge kind="status" status="pending">
                Vínculo com recorrência
              </Badge>
            ) : null}
            {status === "confirmed" ? (
              <Badge kind="status" status="active">
                Confirmada
              </Badge>
            ) : null}
            {status === "rejected" ? (
              <Badge kind="status" status="inactive">
                Rejeitada
              </Badge>
            ) : null}
          </div>
          <Body muted className="text-[.8125rem]">
            {suggestedCategoryIcon ? (
              <span
                aria-hidden="true"
                className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom"
              >
                {suggestedCategoryIcon}
              </span>
            ) : null}
            {suggestedCategoryLabel ? `${suggestedCategoryLabel} · ` : ""}
            {formatDate(date)}
            {isDuplicate && duplicateReason ? ` · ${duplicateReason}` : ""}
          </Body>
        </div>
        <Mono variant="number" tone="out" className="flex-none">
          {formatMoney(amountCents)}
        </Mono>
      </div>
      {status === "pending" ? (
        <div className="mt-3 flex gap-2 border-t border-[var(--lr-border)] pt-3">
          {onConfirm ? (
            <Button variant="primary" size="sm" onClick={onConfirm}>
              Confirmar
            </Button>
          ) : null}
          {onEdit ? (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Editar
            </Button>
          ) : null}
          {onReject ? (
            <Button variant="danger" size="sm" onClick={onReject}>
              Rejeitar
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
