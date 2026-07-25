import { Badge } from "../Badge/Badge";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatMoney } from "../shared/formatMoney";

export type InvoiceStatus = "open" | "closed_awaiting_payment";

export interface CreditCardCardProps {
  institutionName: string;
  logoUrl?: string;
  name?: string;
  /** Fatura fechada + aberta, já somadas pelo caller (§6.4; BACKLOG US-2.1 — este componente não soma faturas). */
  usedCents: number;
  limitCents: number;
  invoiceStatus: InvoiceStatus;
  onClick?: () => void;
}

function InstitutionMark({
  logoUrl,
  institutionName,
}: {
  logoUrl?: string;
  institutionName: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="h-8 w-8 flex-none rounded-[var(--hm-r-sm)] object-contain"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 flex-none items-center justify-center rounded-[var(--hm-r-sm)] bg-[var(--hm-blue-100)] font-bold text-[var(--hm-blue-on-tint)] dark:bg-[var(--hm-blue-700)]/20 dark:text-[var(--hm-blue-300)]"
    >
      {institutionName.charAt(0).toUpperCase()}
    </span>
  );
}

// Presentation-only thresholds for the usage bar's color (§6.4: ~75% aviso
// de proximidade sem badge; >100% mesmo estado de alerta da conta). Not a
// business decision — see Task 2's judgment-call note above.
function usageBarTone(usagePercent: number): string {
  if (usagePercent > 100) {
    return "bg-[var(--hm-clay-650)] dark:bg-[var(--hm-clay-300)]";
  }
  if (usagePercent >= 75) {
    return "bg-[var(--hm-sand-600)] dark:bg-[var(--hm-sand-300)]";
  }
  return "bg-[var(--hm-sage-600)] dark:bg-[var(--hm-sage-300)]";
}

/**
 * Harmon's credit-card summary card. Dumb component: `usedCents` already
 * sums the closed + open invoice (§6.4, BACKLOG US-2.1) — this component
 * only turns the ratio into a progress-bar width/color.
 */
export function CreditCardCard({
  institutionName,
  logoUrl,
  name,
  usedCents,
  limitCents,
  invoiceStatus,
  onClick,
}: CreditCardCardProps) {
  const usagePercent = limitCents > 0 ? (usedCents / limitCents) * 100 : 0;
  const barWidthPercent = Math.min(usagePercent, 100);
  const overLimit = usagePercent > 100;

  return (
    <Card interactive={Boolean(onClick)} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <InstitutionMark
            logoUrl={logoUrl}
            institutionName={institutionName}
          />
          <div className="min-w-0">
            <Body weight="medium" className="truncate">
              {institutionName}
            </Body>
            {name ? (
              <Body muted className="truncate text-[.8125rem]">
                {name}
              </Body>
            ) : null}
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          {invoiceStatus === "closed_awaiting_payment" ? (
            <Badge kind="status" status="pending">
              Fatura fechada
            </Badge>
          ) : null}
          {overLimit ? (
            <Badge kind="status" status="alert">
              Além do limite
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <Mono variant="number" tone="out" className="text-[1.25rem]">
          {formatMoney(usedCents)}
        </Mono>
        <Body muted className="text-[.8125rem]">
          de {formatMoney(limitCents)}
        </Body>
      </div>
      {/* biome-ignore lint/a11y/useFocusableInteractive: progressbar is a read-only status widget per WAI-ARIA APG — it is not expected to be keyboard-operable, so it should not be a tab stop */}
      <div
        role="progressbar"
        aria-label={`${institutionName}: uso do limite`}
        aria-valuenow={Math.round(usagePercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-[var(--hm-r-full)] bg-[var(--hm-surface-sunken)]"
      >
        <div
          style={{ width: `${barWidthPercent}%` }}
          className={[
            "h-full rounded-[var(--hm-r-full)]",
            usageBarTone(usagePercent),
          ].join(" ")}
        />
      </div>
    </Card>
  );
}
