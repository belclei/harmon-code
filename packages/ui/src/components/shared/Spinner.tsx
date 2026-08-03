export type SpinnerSize = "sm" | "md";

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Color comes from `currentColor` by default (inherits the parent's text color) — pass a `text-*` class to override. */
  className?: string;
  /** Accessible label for a standalone spinner. Omit when a sibling text already announces the loading state (e.g. Button's own `aria-busy` + "Carregando…"). */
  label?: string;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
};

/** Lurem's inline loading ring (index.html id="carregando", `.hmc-spinner`). Purely decorative animation — the surrounding view owns the loading state it's reporting. */
export function Spinner({ size = "md", className = "", label }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : "true"}
      className={[
        "inline-flex animate-spin rounded-full border-current border-t-transparent",
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
