// apps/web/src/auth/types.ts
//
// Mirrors the backend contract's response shapes verbatim (see the sprint
// spec). Not sourced from @harmon/domain: Money/BreakdownLine there model
// packages/core's decomposed-calculation output (net worth, projections),
// a different shape than these flat list-endpoint DTOs — reusing them here
// would be forcing a fit, not deduplication.

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  // Judgment call: the spec doesn't enumerate role/avatarMode/themePref's
  // literal unions, and apps/web doesn't branch on their values anywhere
  // yet — kept as `string` rather than guessing at a union the backend
  // owns. Narrow this once a screen actually needs to switch on them.
  role: string;
  isBetaTester: boolean;
  avatarMode: string;
  themePref: string;
  flags: Record<string, boolean>;
}

export type AccountType = "checking" | "savings" | "cash";

export interface AccountDto {
  id: string;
  institutionId: string | null;
  institutionName: string;
  logoUrl?: string;
  name?: string;
  type: AccountType;
  currency: string;
  balanceCents: number;
  overdraftLimitCents: number;
  isOverLimit: boolean;
  isActive: boolean;
}

export type InvoiceStatus = "open" | "closed_awaiting_payment";

export interface CardDto {
  id: string;
  institutionId: string;
  institutionName: string;
  logoUrl?: string;
  name?: string;
  limitCents: number;
  closingDay: number;
  dueDay: number;
  autoDebitAccountId?: string | null;
  currency: string;
  isActive: boolean;
  usedCents: number;
  invoiceStatus: InvoiceStatus;
}
