import { Alert } from "../Alert/Alert";

export interface FieldMessageProps {
  hintId: string;
  errorId: string;
  hint?: string;
  error?: string;
}

/** Shared hint/error line used by form fields (Input, Select, …). */
export function FieldMessage({
  hintId,
  errorId,
  hint,
  error,
}: FieldMessageProps) {
  if (error) {
    return <Alert id={errorId} variant="error" layout="inline" title={error} />;
  }
  if (hint) {
    return (
      <p id={hintId} className="text-[.8125rem] text-[var(--hm-text-2)]">
        {hint}
      </p>
    );
  }
  return null;
}
