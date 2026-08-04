// apps/api/src/transactions/overdraft.ts
// IMPLEMENTACAO.md §2.3 — decisão de escrita sob cheque especial. Não recalcula
// saldo: recebe o saldo atual (derivado por core.balance, fonte única) e o
// delta da escrita, e decide gravar / pedir confirmação / rejeitar.
import type { Account } from "@lurem/db";
import {
  ACCOUNT_CASH_CANNOT_BE_NEGATIVE,
  ACCOUNT_OVERDRAFT_CONFIRMATION_REQUIRED,
} from "../errors.js";

export interface OverdraftCheckParams {
  account: Pick<Account, "type" | "overdraftLimitCents">;
  currentBalanceCents: number;
  /** Variação que a escrita aplica ao saldo (negativa para despesa/transfer-out). */
  deltaCents: number;
  confirmOverLimit: boolean;
}

/**
 * Lança AppError quando a escrita não pode prosseguir. Só se aplica a escritas
 * que de fato reduzem o saldo hoje (delta < 0) — receita, transfer-in, agendada
 * e transação futura passam direto (o saldo não piora agora).
 */
export function assertOverdraftAllowed({
  account,
  currentBalanceCents,
  deltaCents,
  confirmOverLimit,
}: OverdraftCheckParams): void {
  if (deltaCents >= 0) return;

  const projectedBalanceCents = currentBalanceCents + deltaCents;

  // Carteira física: overdraftLimitCents=0 e sem "limite autorizado" para confirmar.
  if (account.type === "cash") {
    if (projectedBalanceCents < 0) throw ACCOUNT_CASH_CANNOT_BE_NEGATIVE();
    return;
  }

  if (
    projectedBalanceCents < -account.overdraftLimitCents &&
    confirmOverLimit !== true
  ) {
    throw ACCOUNT_OVERDRAFT_CONFIRMATION_REQUIRED(
      projectedBalanceCents,
      account.overdraftLimitCents,
    );
  }
}
