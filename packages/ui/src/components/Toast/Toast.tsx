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

// Same "AA against a neutral surface, both themes" pairing already
// established by Alert's INLINE_TONE and Badge's `text` tone (sand-700
// dark:sand-300 etc.) — Toast's icon sits directly on --lr-surface, not a
// tinted wash, so it needs the same light/dark pair rather than the
// dark-only tone this used when the surface was hardcoded to ink-900.
const ICON_TONE: Record<Exclude<ToastVariant, "neutral">, string> = {
  success: "text-[var(--lr-petrol-700)] dark:text-[var(--lr-petrol-300)]",
  danger: "text-[var(--lr-negative)] dark:text-[var(--lr-negative)]",
};

/**
 * Harmon's toast (index.html id="dialogo"). Themed panel — follows
 * Dialog/Sheet's --lr-surface + --lr-border + shadow pattern instead of a
 * fixed dark surface, so it switches with [data-theme="dark"] like the
 * rest of the elevated-surface components. Purely presentational: a single
 * item with no queue, stacking, portal, or auto-dismiss timer of its own —
 * an app-level toast manager owns when/where this renders and for how long.
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
        "flex max-w-[400px] items-start gap-3 rounded-[var(--lr-r-md)] p-3.5",
        "border border-[var(--lr-border)] bg-[var(--lr-surface)]",
        "text-[.875rem] text-[var(--lr-text)] shadow-[var(--lr-e2)]",
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
          className="flex-none cursor-pointer bg-transparent text-[.8125rem] text-[var(--lr-gold-700)] dark:text-[var(--lr-gold-300)]"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
