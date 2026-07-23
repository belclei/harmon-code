import type { ElementType, HTMLAttributes } from "react";

export type BodyWeight = "regular" | "medium";

export interface BodyProps extends HTMLAttributes<HTMLElement> {
  weight?: BodyWeight;
  /** Rendered tag — defaults to `p`. Use `span` for inline runs. */
  as?: ElementType;
  /** Secondary (muted) text color — for captions/help copy, not for errors (use Input's `error`/Alert). */
  muted?: boolean;
}

/** Body text — regular or medium weight. */
export function Body({
  weight = "regular",
  as: Tag = "p",
  muted = false,
  className = "",
  children,
  ...rest
}: BodyProps) {
  return (
    <Tag
      {...rest}
      className={[
        "m-0 text-[.9375rem] leading-relaxed font-sans",
        weight === "medium" ? "font-medium" : "font-normal",
        muted ? "text-[var(--hm-text-2)]" : "text-[var(--hm-text)]",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}
