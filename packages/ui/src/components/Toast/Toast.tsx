import type { ReactNode } from "react";

export type ToastVariant = "neutral" | "success" | "danger";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  variant?: ToastVariant;
  message: string;
  /** A single action, e.g. "Desfazer" (index.html: every reversible destructive action offers Undo for 8s) or "Tentar de novo". */
  action?: ToastAction;
  className?: string;
}

const ICON_PATHS: Record<Exclude<ToastVariant, "neutral">, ReactNode> = {
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  danger: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
};

// --hm-clay-300 (v1.2, harmon-tokens.css) replaces the raw #E08A7D this
// toast's danger icon used in brand/design-system/harmon-components.css —
// same "clay tone readable on a dark surface" token already reused by
// Badge/Input/FieldMessage.
const ICON_TONE: Record<Exclude<ToastVariant, "neutral">, string> = {
  success: "text-[var(--hm-sage-300)]",
  danger: "text-[var(--hm-clay-300)]",
};

/**
 * Harmon's toast (index.html id="dialogo"). Always the dark surface
 * (--hm-ink-900) regardless of theme — a toast reads as a stamped
 * notification, not a themed panel. Purely presentational: a single item
 * with no queue, stacking, portal, or auto-dismiss timer of its own — an
 * app-level toast manager owns when/where this renders and for how long.
 */
export function Toast({
  variant = "neutral",
  message,
  action,
  className = "",
}: ToastProps) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={[
        "flex max-w-[400px] items-start gap-3 rounded-[var(--hm-r-md)] bg-[var(--hm-ink-900)] p-3.5",
        "text-[.875rem] text-[var(--hm-bone-100)] shadow-[var(--hm-e2)]",
        className,
      ].join(" ")}
    >
      {variant !== "neutral" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className={[
            "mt-px h-[18px] w-[18px] flex-none",
            ICON_TONE[variant],
          ].join(" ")}
        >
          {ICON_PATHS[variant]}
        </svg>
      ) : null}
      <span className="flex-1">{message}</span>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="flex-none cursor-pointer bg-transparent text-[.8125rem] text-[var(--hm-sand-500)]"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
