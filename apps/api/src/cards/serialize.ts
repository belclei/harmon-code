// apps/api/src/cards/serialize.ts
import type { CreditCard, Institution } from "@harmon/db";
import { institutionLogoUrl } from "../institutions/logo-url.js";
import { cardInvoiceStatus } from "./invoice-status.js";

export interface CardResponse {
  id: string;
  institutionId: string;
  institutionName: string;
  logoUrl?: string;
  name: string | null;
  limitCents: number;
  closingDay: number;
  dueDay: number;
  autoDebitAccountId: string | null;
  currency: string;
  isActive: boolean;
  usedCents: number;
  invoiceStatus: "open" | "closed_awaiting_payment";
}

// Sprint 4 has no transaction-creation endpoint yet (US-3.5, Sprint 5), so
// `transactions` is always [] today for freshly-listed cards — usedCents will
// be 0 until then. Wired to the real core function now so it's correct the
// moment transactions exist.
export function toCardResponse(
  card: CreditCard,
  institution: Institution,
): CardResponse {
  const { usedCents, invoiceStatus } = cardInvoiceStatus(
    {
      id: card.id,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      autoDebitAccountId: card.autoDebitAccountId,
      isActive: card.isActive,
    },
    [],
  );

  return {
    id: card.id,
    institutionId: card.institutionId,
    institutionName: institution.name,
    logoUrl: institutionLogoUrl(institution),
    name: card.name,
    limitCents: card.limitCents,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    autoDebitAccountId: card.autoDebitAccountId,
    currency: card.currency,
    isActive: card.isActive,
    usedCents,
    invoiceStatus,
  };
}
