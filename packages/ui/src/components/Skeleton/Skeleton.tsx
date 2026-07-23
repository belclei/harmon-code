import type { CSSProperties } from "react";

export type SkeletonShape = "text" | "circle" | "rect";

export interface SkeletonProps {
  shape?: SkeletonShape;
  /** CSS width, e.g. "100%", "12rem", 240. */
  width?: string | number;
  /** CSS height. Defaults to "1em" for `text`, "100%" for the others. */
  height?: string | number;
  className?: string;
}

/**
 * Loading placeholder with a light shimmer sweep. Purely decorative — the
 * surrounding view is responsible for announcing loading state to assistive
 * tech (e.g. a `role="status"` region wrapping a group of these).
 */
export function Skeleton({
  shape = "rect",
  width,
  height,
  className = "",
}: SkeletonProps) {
  const style: CSSProperties = {
    width,
    height: height ?? (shape === "text" ? "1em" : undefined),
  };

  const radius =
    shape === "circle"
      ? "rounded-full"
      : shape === "text"
        ? "rounded-[var(--hm-r-sm)]"
        : "rounded-[var(--hm-r-md)]";

  return (
    <span
      aria-hidden="true"
      style={style}
      className={[
        "relative block overflow-hidden bg-[var(--hm-border)]/50",
        shape === "circle" ? "aspect-square" : "",
        radius,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent",
          "via-white/50 dark:via-white/15",
          "animate-[hm-skeleton-shimmer_1.6s_ease-in-out_infinite]",
        ].join(" ")}
      />
    </span>
  );
}
