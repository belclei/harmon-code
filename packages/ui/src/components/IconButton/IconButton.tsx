import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /**
   * Required, not optional. This button never renders visible text — the
   * icon inside it is `aria-hidden` — so without an explicit label it would
   * have no accessible name at all (a classic axe `button-name` failure).
   * TypeScript enforces this at the call site instead of leaving it to a
   * lint rule or a runtime check.
   */
  "aria-label": string;
  /** The icon itself (an inline SVG). Rendered `aria-hidden` — the label above carries the accessible name. */
  children: ReactNode;
  className?: string;
}

/**
 * Harmon's square icon-only button (index.html id="botao", `.hmc-iconbtn`:
 * 40×40, transparent, --hm-text-2 → hover --hm-surface-sunken/--hm-text).
 * Dumb component: like `Button`, it never decides what the click means.
 */
export function IconButton({
  children,
  className = "",
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      className={[
        "inline-grid h-10 w-10 flex-none place-items-center rounded-[var(--hm-r-md)] border border-transparent",
        "bg-transparent text-[var(--hm-text-2)]",
        "transition-colors duration-150 ease-out",
        "hover:bg-[var(--hm-surface-sunken)] hover:text-[var(--hm-text)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-[18px] w-[18px] [&>svg]:h-full [&>svg]:w-full"
      >
        {children}
      </span>
    </button>
  );
}
