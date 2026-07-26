// apps/api/src/errors.ts
export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: ErrorDetail[];
  // Structured payload for errors whose client needs numbers, not a field list
  // (ex.: overdraft — §2.3 exige details.projectedBalanceCents/overdraftLimitCents).
  readonly data?: Record<string, unknown>;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: ErrorDetail[],
    data?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.data = data;
  }
}

// Catalog from IMPLEMENTACAO.md §7 — only the codes this sprint's routes emit.
// Message text is copied verbatim from the spec table.
export const AUTH_INVALID_CREDENTIALS = () =>
  new AppError("auth.invalid_credentials", 401, "E-mail ou senha incorretos.");
export const AUTH_RATE_LIMITED = () =>
  new AppError(
    "auth.rate_limited",
    429,
    "Muitas tentativas. Tente de novo em alguns minutos.",
  );
export const AUTH_TOKEN_INVALID = () =>
  new AppError(
    "auth.token_invalid",
    400,
    "Este link não é mais válido. Peça um novo na página de acesso.",
  );
export const VALIDATION_FAILED = (details: ErrorDetail[]) =>
  new AppError(
    "validation.failed",
    400,
    "Alguns campos precisam de atenção.",
    details,
  );
export const NOT_FOUND = () =>
  new AppError("not_found", 404, "Não encontramos o que você procurava.");
// §2.3 — escrita ultrapassaria o cheque especial e confirmOverLimit !== true.
// Não grava; client remonta o aviso a partir de data.{projectedBalanceCents,overdraftLimitCents}.
export const ACCOUNT_OVERDRAFT_CONFIRMATION_REQUIRED = (
  projectedBalanceCents: number,
  overdraftLimitCents: number,
) =>
  new AppError(
    "account.overdraft_confirmation_required",
    409,
    "Esta transação deixa a conta além do limite de cheque especial. Confirmar mesmo assim?",
    undefined,
    { projectedBalanceCents, overdraftLimitCents },
  );
// §2.3 — carteira física (type=cash) não pode ficar negativa; sem confirmOverLimit.
export const ACCOUNT_CASH_CANNOT_BE_NEGATIVE = () =>
  new AppError(
    "account.cash_cannot_be_negative",
    422,
    "A carteira não pode ficar negativa.",
  );
// §7 — transação pertence a uma conta OU a um cartão, nunca aos dois (nem a nenhum).
export const TRANSACTION_ACCOUNT_XOR_CARD = () =>
  new AppError(
    "transaction.account_xor_card",
    422,
    "A transação pertence a uma conta ou a um cartão, nunca aos dois.",
  );
export const INTERNAL = () =>
  new AppError(
    "internal",
    500,
    "Algo deu errado do nosso lado. Já estamos vendo.",
  );
