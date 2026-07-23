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
        // Pre-existing gap surfaced while re-running axe-core for this
        // task (unrelated to the icon swap above): --hm-clay-600 on the
        // dark theme's --hm-bg measured 3.17:1, short of 4.5:1 — this
        // token was never given a dark-mode step. --hm-clay-500 (used for
        // Alert's danger *icon*, a non-text graphic that only needs 3:1)
        // isn't enough either — it measures 3.95:1 for body *text*, which
        // needs 4.5:1. #E08A7D is Badge.tsx's precedent for this exact
        // problem: it's --hm-money-out's dark-mode value, the brand's
        // already-AA-checked "clay tone readable on a dark surface."
        className="flex items-start gap-1.5 text-[.8125rem] text-[var(--hm-clay-600)] dark:text-[#E08A7D]"
      >
        {/* index.html id="campo" field-error example: same stroke-based
            circle+bar+dot "!" glyph as Alert's danger icon (dot below the
            bar) — not the older filled 20×20 Heroicons triangle-warning
            shape this shared component used before. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="mt-0.5 h-3.5 w-3.5 flex-none"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
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
