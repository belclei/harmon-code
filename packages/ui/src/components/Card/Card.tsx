import type { HTMLAttributes } from "react";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding scale, in Harmon's base-8 spacing tokens. `md` (24px) is the default from harmon-tokens.css's `.hm-card` primitive. */
  padding?: CardPadding;
  /** Recessed background — nest a card inside another surface without a heavier border. */
  sunken?: boolean;
  /** Dashed border, transparent background — empty/placeholder slots. */
  dashed?: boolean;
  /** Adds hover affordance (border + shadow) for clickable cards. Pass your own `onClick`; this component never assumes what a click does. */
  interactive?: boolean;
}

// Only overridden inline when it differs from the `.hm-card` primitive's
// built-in padding (var(--hm-s3)), so we never fight CSS cascade-layer
// ordering between an unlayered token stylesheet and Tailwind's utilities.
const PADDING_OVERRIDE: Record<CardPadding, string | undefined> = {
  none: "0",
  sm: "var(--hm-s2)",
  md: undefined,
  lg: "var(--hm-s4)",
};

/**
 * Harmon's base surface container. Purely presentational: padding, border
 * and shadow come from `--hm-*` tokens via the `.hm-card` primitive; this
 * component adds no state and no behavior of its own.
 */
export function Card({
  padding = "md",
  sunken = false,
  dashed = false,
  interactive = false,
  className = "",
  style,
  children,
  onClick,
  onKeyDown,
  ...rest
}: CardProps) {
  const paddingOverride = PADDING_OVERRIDE[padding];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // If onClick is provided, make the card keyboard-accessible via Enter and Space
    if (onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
    // Call any existing onKeyDown handler from props
    onKeyDown?.(event);
  };

  return (
    <div
      {...rest}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : onKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={
        paddingOverride !== undefined
          ? { padding: paddingOverride, ...style }
          : style
      }
      className={[
        "hm-card",
        sunken ? "bg-[var(--hm-surface-sunken)]" : "",
        dashed ? "border-dashed bg-transparent" : "",
        interactive
          ? "cursor-pointer transition-[box-shadow,border-color] duration-150 hover:border-[var(--hm-ink-300)] hover:shadow-[var(--hm-e1)]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
