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
  birthDate: string;
  hasPassword: boolean;
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

export type TxKind = "income" | "expense" | "transfer";
export type TxSource = "manual" | "import";
export type TxDirection = "out" | "in";

export interface TransactionDto {
  id: string;
  kind: TxKind;
  source: TxSource;
  description: string;
  transactionDate: string;
  accountId: string | null;
  creditCardId: string | null;
  categoryId: string | null;
  currency: string;
  amountCents: number;
  amountBRLCents: number;
  isScheduled: boolean;
  transferPairId: string | null;
  transferDirection: TxDirection | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentPurchaseAmountCents: number | null;
  recurringTransactionId: string | null;
  createdAt: string;
}

export interface RecurringDto {
  id: string;
  description: string;
  kind: "income" | "expense";
  accountId: string | null;
  creditCardId: string | null;
  categoryId: string | null;
  referenceAmountCents: number;
  referenceAmountBRLCents: number;
  currency: string;
  dayOfMonth: number;
  isVariableAmount: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
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
