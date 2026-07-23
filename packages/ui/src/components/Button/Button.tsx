import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  /** Visual style of the button. */
  variant?: ButtonVariant;
  /** Size preset — mirrors the `sm`/`md`/`lg` scale already established in the brand's reference design system. */
  size?: ButtonSize;
  /** Shows a spinner and puts the button in a busy, non-interactive state. Purely presentational — callers own the async logic. */
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Dark theme redefines --hm-bg to var(--hm-ink-900) too (see
  // harmon-tokens.css's [data-theme="dark"] block) — with no dark-mode
  // override, a --hm-ink-900 button on a --hm-ink-900 page is nearly
  // invisible. brand/design-system/harmon-components.css has this same gap
  // (.hmc-btn--primary is never overridden for dark). Fixed here by
  // stepping the whole light-mode ramp (900→700→800) up one notch in dark
  // mode (700→600→800) so the button never matches the page background.
  primary:
    "bg-[var(--hm-ink-900)] text-[var(--hm-bone-000)] border border-transparent " +
    "hover:bg-[var(--hm-ink-700)] active:bg-[var(--hm-ink-800)] " +
    "dark:bg-[var(--hm-ink-700)] dark:hover:bg-[var(--hm-ink-600)] dark:active:bg-[var(--hm-ink-800)]",
  secondary:
    "bg-[var(--hm-surface)] text-[var(--hm-text)] border border-[var(--hm-border)] " +
    "hover:bg-[var(--hm-surface-sunken)] hover:border-[var(--hm-ink-300)] active:bg-[var(--hm-bone-100)]",
  // active: text-2 (#5f6c80) measured 4.12:1 against the active background
  // (border/40 over the page bg) — short of AA's 4.5:1. Verified with axe-core;
  // switching to full-strength text on active (matches the hover treatment)
  // clears it.
  tertiary:
    "bg-transparent text-[var(--hm-text-2)] border border-transparent " +
    "hover:bg-[var(--hm-surface-sunken)] hover:text-[var(--hm-text)] " +
    "active:bg-[var(--hm-border)]/40 active:text-[var(--hm-text)]",
  // #9E4438 mirrors the hover shade already hardcoded in
  // brand/design-system/harmon-components.css — there is no --hm-clay-700
  // token for it yet. Flagged in the Sprint report as a token gap.
  danger:
    "bg-[var(--hm-clay-600)] text-white border border-transparent " +
    "hover:bg-[#9E4438] active:bg-[#8B3C31]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-[.8125rem] px-3.5 py-2 min-h-9 rounded-[var(--hm-r-sm)]",
  md: "text-sm px-4 py-2.5 min-h-11 rounded-[var(--hm-r-md)]",
  lg: "text-base px-7 py-4 min-h-13 rounded-[var(--hm-r-md)]",
};

/**
 * Harmon's base action trigger. A dumb, presentational component: it never
 * fetches data or knows what clicking it does — that is entirely up to the
 * `onClick` handler passed in by the caller.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        "relative inline-flex items-center justify-center gap-2 font-sans font-bold",
        "transition-colors duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      <span className={loading ? "opacity-0" : "opacity-100"}>{children}</span>
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className={[
              "absolute inset-0 m-auto h-4 w-4 animate-spin rounded-full",
              "border-2 border-current border-t-transparent opacity-70",
            ].join(" ")}
          />
          <span className="sr-only">Carregando…</span>
        </>
      ) : null}
    </button>
  );
}
