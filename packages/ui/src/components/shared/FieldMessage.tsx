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
    return (
      <p
        id={errorId}
        className="flex items-start gap-1.5 text-[.8125rem] text-[var(--hm-clay-600)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 h-3.5 w-3.5 flex-none"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.164c.75 1.333-.213 2.987-1.743 2.987H3.72c-1.53 0-2.493-1.654-1.743-2.987L8.257 3.1zM10 7a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        {error}
      </p>
    );
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
