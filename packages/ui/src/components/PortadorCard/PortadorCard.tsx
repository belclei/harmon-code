import { useState } from "react";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Card } from "../Card/Card";
import { Select } from "../Select/Select";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatDate } from "../shared/formatDate";
import { formatMoney } from "../shared/formatMoney";

export type PortadorStatus = "pending" | "accepted" | "rejected" | "settled";

const STATUS_BADGE: Record<
  PortadorStatus,
  { status: "active" | "pending" | "inactive" | "alert"; label: string }
> = {
  pending: { status: "pending", label: "Pendente" },
  accepted: { status: "active", label: "Aceito" },
  rejected: { status: "alert", label: "Rejeitado" },
  settled: { status: "active", label: "Acertado" },
};

export interface PortadorCardProps {
  counterpartName: string;
  description: string;
  amountCents: number;
  date: string;
  status: PortadorStatus;
  /** Only meaningful when `status="pending"` — the current user's own accounts/cards to assign into (§6.10 item 3). Data comes via prop; this component never fetches. */
  targetOptions?: Array<{ id: string; label: string }>;
  onAccept?: (targetId: string) => void;
  onReject?: () => void;
  /** Pre-composed relational copy ("Acerto pendente com Maria · R$ 320 a seu favor") — see Task 9's judgment-call note on why this is a string, not structured props. */
  settlementLabel?: string;
  onMarkSettled?: () => void;
}

/**
 * Harmon's portador (shared-cardholder) validation card. Dumb component:
 * status/copy arrive via props; direction of settlement ("a seu favor" vs.
 * reverse) is decided by the caller, never computed here (§6.10, §8.2 —
 * "informação, não julgamento" applies to relationships between people too).
 */
export function PortadorCard({
  counterpartName,
  description,
  amountCents,
  date,
  status,
  targetOptions,
  onAccept,
  onReject,
  settlementLabel,
  onMarkSettled,
}: PortadorCardProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const badge = STATUS_BADGE[status];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Body weight="medium" className="truncate">
            {description}
          </Body>
          <Body muted className="text-[.8125rem]">
            {counterpartName} · {formatDate(date)}
          </Body>
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <Badge kind="status" status={badge.status}>
            {badge.label}
          </Badge>
          <Mono variant="number" tone="out">
            {formatMoney(amountCents)}
          </Mono>
        </div>
      </div>
      {status === "pending" && targetOptions && targetOptions.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--hm-border)] pt-3">
          <Select
            label="Atribuir a"
            options={targetOptions.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
            value={selectedTarget}
            onChange={setSelectedTarget}
            placeholder="Escolha uma conta ou cartão"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!selectedTarget}
              onClick={() => selectedTarget && onAccept?.(selectedTarget)}
              className="cursor-pointer rounded-[var(--hm-r-sm)] bg-[var(--hm-sage-700)] px-3 py-1.5 text-[.8125rem] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* No "success" Button variant exists yet — this stays hand-rolled until one is added. */}
              Aceitar
            </button>
            <Button variant="secondary" size="sm" onClick={onReject}>
              Rejeitar
            </Button>
          </div>
        </div>
      ) : null}
      {status === "accepted" && settlementLabel ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--hm-border)] pt-3">
          <Body muted className="text-[.8125rem]">
            {settlementLabel}
          </Body>
          {onMarkSettled ? (
            <Button variant="secondary" size="sm" onClick={onMarkSettled}>
              Marcar como acertado
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
