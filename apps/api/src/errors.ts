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
// §6.13 — Configurações: troca de senha exige a senha atual correta.
export const SETTINGS_WRONG_PASSWORD = () =>
  new AppError("settings.wrong_password", 401, "Senha atual incorreta.");
// §6.13 — conta Google-only (passwordHash nulo) não tem senha para trocar.
export const SETTINGS_PASSWORD_NOT_SET = () =>
  new AppError(
    "settings.password_not_set",
    422,
    "Esta conta usa login via Google — não há senha para trocar.",
  );
// §6.13 — Zona de Risco: exige digitar "APAGAR" literal, sem exclusão de um clique.
export const SETTINGS_DELETE_CONFIRMATION_MISMATCH = () =>
  new AppError(
    "settings.delete_confirmation_mismatch",
    400,
    'Digite "APAGAR" para confirmar.',
  );
// §7.1 — admin não pode remover a si mesmo do papel se for o último admin.
export const ADMIN_LAST_ADMIN = () =>
  new AppError(
    "admin.last_admin",
    422,
    "Não é possível remover o último administrador.",
  );
export const ADMIN_FORBIDDEN = () =>
  new AppError("admin.forbidden", 403, "Você não tem acesso a esta área.");
// §6.10 — compartilhamento: só o dono pode alterar permissão/revogar.
export const SHARE_NOT_OWNER = () =>
  new AppError(
    "share.not_owner",
    403,
    "Só o dono pode alterar o compartilhamento deste item.",
  );
// §6.10 — ação de portador/settle exige conexão aceita entre os dois usuários.
export const CONNECTION_NOT_ACCEPTED = () =>
  new AppError(
    "connection.not_accepted",
    409,
    "Vocês ainda não estão conectados.",
  );
// §6.1 — cadastro via link expirado.
export const AUTH_TOKEN_EXPIRED = () =>
  new AppError(
    "auth.token_expired",
    410,
    "Seu link de cadastro expirou. Solicite o reenvio.",
  );
