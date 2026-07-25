import { Badge } from "../Badge/Badge";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatMoney } from "../shared/formatMoney";

export type AccountType = "checking" | "savings" | "cash";

export interface AccountCardProps {
  /** Institution is the primary identifier (ARQUITETURA.md §6.4) — always shown, even for `type="cash"` (renders "Carteira" convention via `institutionName`, no separate cash-only branch needed). */
  institutionName: string;
  /** Logo image URL. Absent → generic initial-in-brand-color fallback (§6.4: "instituição fora da lista → ícone genérico com a inicial"). */
  logoUrl?: string;
  /** Optional disambiguation ("Nubank PJ") — `name` is facultative per §6.4. */
  name?: string;
  type: AccountType;
  balanceCents: number;
  isActive: boolean;
  /** Decided by the caller from real account state — see Task 1's judgment-call note. When true, renders the alert badge. */
  overLimit?: boolean;
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

/**
 * Harmon's account summary card. Dumb component: `overLimit` and `isActive`
 * arrive as props — it never computes whether a balance breaches the
 * overdraft limit (§6.4, BACKLOG US-2.1).
 */
export function AccountCard({
  institutionName,
  logoUrl,
  name,
  type,
  balanceCents,
  isActive,
  overLimit = false,
  onClick,
}: AccountCardProps) {
  const isNegative = balanceCents < 0;

  return (
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={isActive ? "" : "opacity-60"}
    >
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
          {!isActive ? (
            <Badge kind="status" status="inactive">
              Inativa
            </Badge>
          ) : null}
          {isActive && overLimit ? (
            <Badge kind="status" status="alert">
              Além do limite
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <Mono
          variant="number"
          tone={isNegative ? "out" : "default"}
          className="text-[1.25rem]"
        >
          {formatMoney(balanceCents)}
        </Mono>
      </div>
    </Card>
  );
}
