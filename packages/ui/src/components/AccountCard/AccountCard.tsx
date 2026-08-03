import { Badge } from "../Badge/Badge";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatMoney } from "../shared/formatMoney";

export type AccountType = "checking" | "savings" | "cash";

const TYPE_LABEL: Record<AccountType, string> = {
  checking: "Corrente",
  savings: "Poupança",
  cash: "Dinheiro",
};

export interface AccountCardProps {
  /** Institution is the primary identifier (ARQUITETURA.md §6.4) — always shown, even for `type="cash"` (renders "Carteira" convention via `institutionName`, no separate cash-only branch needed). */
  institutionName: string;
  /** Logo image URL. Absent → generic initial-in-brand-color fallback (§6.4: "instituição fora da lista → ícone genérico com a inicial"). */
  logoUrl?: string;
  /** Optional disambiguation ("Nubank PJ") — `name` is facultative per §6.4. */
  name?: string;
  type: AccountType;
  balanceCents: number;
  /** Cheque especial limit — 0/absent renders as "sem limite". Ignored for `type="cash"` (design_handoff: carteira sempre mostra "nunca fica negativa"). */
  overdraftLimitCents?: number;
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
        className="h-12 w-12 flex-none rounded-[var(--lr-r-md)] object-contain"
      />
    );
  }
  return (
    // REBRAND (Task 1.3): blue-100/700/300 -> petrol-100/700/300 and
    // blue-on-tint -> positive-on-tint — spec-backed (DESIGN_SYSTEM.md
    // §1.2 lists "componentes selecionados" as Petrol; this institution-icon
    // chip is grouped with that selection-state family per the task brief).
    <span
      aria-hidden="true"
      className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--lr-r-md)] bg-[var(--lr-petrol-100)] text-[1.0625rem] font-bold text-[var(--lr-positive-on-tint)] dark:bg-[var(--lr-petrol-700)]/20 dark:text-[var(--lr-petrol-300)]"
    >
      {institutionName.charAt(0).toUpperCase()}
    </span>
  );
}

// design_handoff_harmon/design/Harmon.dc.html ("Contas e cartões" screen):
// carteira never carries an institution or a cheque-especial limit, so its
// meta line is a fixed sentence rather than a formatted limit value.
function accountMeta(type: AccountType, overdraftLimitCents: number): string {
  if (type === "cash") return "Sem instituição · nunca fica negativa";
  if (overdraftLimitCents > 0) {
    return `Limite (cheque especial) ${formatMoney(overdraftLimitCents)}`;
  }
  return "Sem limite de cheque especial";
}

/**
 * Lurem's account summary row. Dumb component: `overLimit` and `isActive`
 * arrive as props — it never computes whether a balance breaches the
 * overdraft limit (§6.4, BACKLOG US-2.1). Layout matches the design
 * handoff's `.hmc-account` row: icon, name/meta, balance — stacked as a
 * single-column list, not a card grid.
 */
export function AccountCard({
  institutionName,
  logoUrl,
  name,
  type,
  balanceCents,
  overdraftLimitCents = 0,
  isActive,
  overLimit = false,
  onClick,
}: AccountCardProps) {
  const isNegative = balanceCents < 0;

  return (
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={["flex items-start gap-3", isActive ? "" : "opacity-60"].join(
        " ",
      )}
    >
      <InstitutionMark logoUrl={logoUrl} institutionName={institutionName} />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex flex-wrap items-center gap-2">
          <Body as="span" weight="medium" className="truncate">
            {institutionName}
            {name ? ` · ${name}` : ""}
          </Body>
          <Badge kind="category" color="ink">
            {TYPE_LABEL[type]}
          </Badge>
        </p>
        <Body muted className="mt-0.5 text-[.75rem]">
          {accountMeta(type, overdraftLimitCents)}
        </Body>
      </div>
      <div className="flex flex-none flex-col items-end gap-1">
        <Mono
          variant="number"
          tone={isNegative ? "out" : "default"}
          className="text-[1.25rem]"
        >
          {formatMoney(balanceCents)}
        </Mono>
        <Body muted className="text-[.75rem]">
          saldo atual
        </Body>
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
    </Card>
  );
}
