import type { HTMLAttributes } from "react";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding scale, in Lurem's base-8 spacing tokens. `md` (24px) is the default from lurem-tokens.css's `.lr-card` primitive. */
  padding?: CardPadding;
  /** Recessed background — nest a card inside another surface without a heavier border. */
  sunken?: boolean;
  /** Dashed border, transparent background — empty/placeholder slots. */
  dashed?: boolean;
  /** Adds hover affordance (border + shadow) for clickable cards. Pass your own `onClick`; this component never assumes what a click does. */
  interactive?: boolean;
}

// Only overridden inline when it differs from the `.lr-card` primitive's
// built-in padding (var(--lr-s3)), so we never fight CSS cascade-layer
// ordering between an unlayered token stylesheet and Tailwind's utilities.
const PADDING_OVERRIDE: Record<CardPadding, string | undefined> = {
  none: "0",
  sm: "var(--lr-s2)",
  md: undefined,
  lg: "var(--lr-s4)",
};

/**
 * Lurem's base surface container. Purely presentational: padding, border
 * and shadow come from `--lr-*` tokens via the `.lr-card` primitive; this
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
    // Passthrough always fires, matching native <div onKeyDown> bubbling semantics.
    onKeyDown?.(event);
    // onClick's Enter/Space activation only fires for keydowns on the Card's
    // own element — a bubbled keydown from a nested interactive child (e.g.
    // a button inside a clickable Card) must not hijack its native behavior.
    if (
      onClick &&
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
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
        "lr-card",
        // `!` (Tailwind v4 important-modifier) is required here: lurem-tokens.css's
        // `.lr-card` sets `background`/`border` as an unlayered shorthand rule, and
        // unlayered CSS always wins over Tailwind's utilities (emitted inside
        // `@layer utilities`) regardless of source order or specificity — without
        // it, `sunken`/`dashed` silently no-op (e.g. TransactionRow's "agendada"
        // card rendered a solid border instead of dashed). Same class of bug
        // already flagged/fixed with `!` on Alert.tsx's action button text color.
        sunken ? "bg-[var(--lr-surface-sunken)]!" : "",
        dashed ? "border-dashed! bg-transparent!" : "",
        interactive
          ? "cursor-pointer transition-[box-shadow,border-color] duration-150 hover:border-[var(--lr-night-300)] hover:shadow-[var(--lr-e1)]"
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
