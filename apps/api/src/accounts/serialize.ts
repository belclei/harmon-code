// apps/api/src/accounts/serialize.ts
// Shared balance/isOverLimit derivation (IMPLEMENTACAO.md §2.1/§2.3) for the
// account list/detail responses. Reuses packages/core — never recomputes the
// formula locally (single source of truth for "what is the real balance").
import { balance } from "@harmon/core";
import type { Account, Institution } from "@harmon/db";
import { institutionLogoUrl } from "../institutions/logo-url.js";

export interface AccountResponse {
  id: string;
  institutionId: string | null;
  institutionName: string;
  logoUrl?: string;
  name: string | null;
  type: Account["type"];
  currency: string;
  balanceCents: number;
  overdraftLimitCents: number;
  isOverLimit: boolean;
  isActive: boolean;
}

// Sprint 4 has no transaction-creation endpoint yet (that's US-3.5, Sprint 5),
// so `transactions` is always [] today — the balance/core wiring is done now
// so it's correct the moment transactions exist, not bolted on later.
export function toAccountResponse(
  account: Account,
  institution: Institution | null,
): AccountResponse {
  const money = balance({
    account: {
      id: account.id,
      type: account.type,
      openingBalanceCents: account.openingBalanceCents,
      overdraftLimitCents: account.overdraftLimitCents,
      isActive: account.isActive,
    },
    transactions: [],
    asOf: new Date(),
  });

  return {
    id: account.id,
    institutionId: account.institutionId,
    institutionName:
      account.type === "cash" ? "Carteira" : (institution?.name ?? ""),
    logoUrl: institutionLogoUrl(institution),
    name: account.name,
    type: account.type,
    currency: account.currency,
    balanceCents: money.valueCents,
    overdraftLimitCents: account.overdraftLimitCents,
    isOverLimit: money.valueCents < -account.overdraftLimitCents,
    isActive: account.isActive,
  };
}
