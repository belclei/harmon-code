import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatMoney } from "../shared/formatMoney";

export interface TransferAccount {
  name: string;
  institution: string;
  balanceAfterCents: number;
}

export interface TransferPairCardProps {
  amountCents: number;
  from: TransferAccount;
  to: TransferAccount;
}

/**
 * Transfer pair card showing a paired transfer transaction between two accounts.
 * Displays header with transfer title, from/to account rows, and footer disclaimer.
 * Uses existing Card, Mono, Body components and inline SVG icons for transfer arrows.
 */
export function TransferPairCard({
  amountCents,
  from,
  to,
}: TransferPairCardProps) {
  return (
    <Card>
      {/* Header: transfer icon + title + amount */}
      <div className="mb-4 flex items-center gap-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5 flex-none text-[var(--lr-text-secondary)]"
        >
          <path d="M7 16a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h10m-10 12h10a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1M7 5l-3 3m3-3l3 3m10 6l-3-3m3 3l-3-3" />
        </svg>
        <div className="flex-1">
          <Body weight="medium">Transferência entre suas contas</Body>
        </div>
        <Mono variant="number" className="flex-none text-[1rem]">
          {formatMoney(amountCents)}
        </Mono>
      </div>

      {/* From account row */}
      <div className="mb-3 flex items-center gap-3 border-t border-[var(--lr-border)] pt-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5 flex-none text-[var(--lr-text-secondary)]"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <div className="min-w-0 flex-1">
          <Body weight="medium" className="truncate">
            {from.name}
          </Body>
          <Body muted className="text-[.75rem]">
            {from.institution}
          </Body>
        </div>
        <Mono variant="number" tone="out" className="flex-none">
          −{formatMoney(amountCents)}
        </Mono>
      </div>

      {/* To account row */}
      <div className="mb-3 flex items-center gap-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5 flex-none text-[var(--lr-text-secondary)]"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <div className="min-w-0 flex-1">
          <Body weight="medium" className="truncate">
            {to.name}
          </Body>
          <Body muted className="text-[.75rem]">
            {to.institution}
          </Body>
        </div>
        <Mono variant="number" tone="in" className="flex-none">
          +{formatMoney(amountCents)}
        </Mono>
      </div>

      {/* Footer: disclaimer */}
      <div className="mt-4 border-t border-[var(--lr-border)] pt-3">
        <Body muted className="text-[.75rem]">
          Não conta como receita nem despesa.
        </Body>
      </div>
    </Card>
  );
}
