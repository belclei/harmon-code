import type { ButtonHTMLAttributes, ReactNode } from "react";

// "link" is additive over IMPLEMENTACAO.md §10.1a's 4-variant list
// (primary/secondary/tertiary/danger) — brand/design-system/index.html's
// button section (id="botao") documents 5 variants, the 5th being a
// text-link style action (e.g. "De onde vem esse número?") with no
// background/padding, underlined, at --hm-blue-700. Kept alongside
// `tertiary` rather than renamed/merged: `tertiary` already renders
// identically to the reference's `ghost` (padded, bordered-transparent
// button), which is a *different* affordance than an inline text link.
// Flagged for whoever owns IMPLEMENTACAO.md: the spec's variant list is
// now one short of the reference's.
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  /** Visual style of the button. */
  variant?: ButtonVariant;
  /** Size preset — mirrors the `sm`/`md`/`lg` scale already established in the brand's reference design system. */
  size?: ButtonSize;
  /** Shows a spinner and puts the button in a busy, non-interactive state. Purely presentational — callers own the async logic. */
  loading?: boolean;
  /**
   * Icon rendered before the label (index.html "com ícone" example,
   * id="botao"). Always `aria-hidden` — the label is the accessible name.
   * There is no trailing-icon slot: the reference only ever shows a leading
   * icon on this component (a distinct icon-only square button — see
   * `IconButton` — covers the icon-with-no-label case).
   */
  leadingIcon?: ReactNode;
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
  // index.html lines ~63-67 of harmon-components.css (`.hmc-btn--link`):
  // background none, padding 0, min-height 0, underlined, --hm-blue-700,
  // hover → --hm-ink-900. --hm-blue-700/--hm-ink-900 are only AA-checked
  // against a light page (harmon-tokens.css's own v1.1 comment, same caveat
  // already noted for Alert/Badge above) — dark mode steps to the same
  // --hm-blue-300/--hm-bone-100 pairing used elsewhere in this file.
  link:
    "bg-transparent text-[var(--hm-blue-700)] dark:text-[var(--hm-blue-300)] border border-transparent " +
    "underline underline-offset-[3px] decoration-1 " +
    "hover:text-[var(--hm-ink-900)] dark:hover:text-[var(--hm-bone-100)]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-[.8125rem] px-3.5 py-2 min-h-9 rounded-[var(--hm-r-sm)]",
  md: "text-sm px-4 py-2.5 min-h-11 rounded-[var(--hm-r-md)]",
  lg: "text-base px-7 py-4 min-h-13 rounded-[var(--hm-r-md)]",
};

// `link` ignores the sm/md/lg padding/min-height scale entirely (reference
// has no such combination — a text link has no touch-target box to size);
// only the font-size still tracks the requested size.
const LINK_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-[.8125rem] p-0 min-h-0",
  md: "text-sm p-0 min-h-0",
  lg: "text-base p-0 min-h-0",
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
  leadingIcon,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isLink = variant === "link";

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
        isLink ? LINK_SIZE_CLASSES[size] : SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex items-center gap-2",
          loading ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className="inline-flex h-[15px] w-[15px] flex-none [&>svg]:h-full [&>svg]:w-full"
          >
            {leadingIcon}
          </span>
        ) : null}
        {children}
      </span>
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
