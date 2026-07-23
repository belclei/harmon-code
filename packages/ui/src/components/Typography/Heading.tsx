import type { HTMLAttributes } from "react";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic + visual level. There is no separate "visual size" prop — level drives both, so headings never lie to assistive tech. */
  level: HeadingLevel;
}

const SIZE_CLASSES: Record<HeadingLevel, string> = {
  1: "text-[2.25rem] leading-[1.15] tracking-[-0.02em]",
  2: "text-[1.875rem] leading-[1.2] tracking-[-0.015em]",
  3: "text-[1.5rem] leading-[1.25]",
  4: "text-[1.25rem] leading-[1.3]",
  5: "text-[1.0625rem] leading-[1.35]",
  6: "text-[.9375rem] leading-[1.4] uppercase tracking-[.06em]",
};

/** Heading levels 1–6. Semantic tag always matches the visual level. */
export function Heading({
  level,
  className = "",
  children,
  ...rest
}: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      {...rest}
      className={[
        "m-0 font-sans font-bold text-[var(--hm-text)]",
        SIZE_CLASSES[level],
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}
