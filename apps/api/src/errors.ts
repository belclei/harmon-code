// apps/api/src/errors.ts
export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: ErrorDetail[];

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
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
export const INTERNAL = () =>
  new AppError(
    "internal",
    500,
    "Algo deu errado do nosso lado. Já estamos vendo.",
  );
