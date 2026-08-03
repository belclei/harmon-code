import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
  useState,
} from "react";

export interface TooltipProps {
  content: ReactNode;
  /** The trigger — must be a single element (a Button/IconButton-like control); it receives `aria-describedby` while the tooltip is visible. */
  children: ReactElement;
  /**
   * Which side the bubble opens on. This package has no positioning-library
   * dependency (no floating-ui/popper) — placement is fixed CSS, not
   * collision-aware. Pick the side that fits the surrounding layout.
   */
  side?: "top" | "bottom";
  className?: string;
}

/** Harmon's tooltip (index.html id="dialogo"). Purely presentational — visibility is local hover/focus state, not app state. */
export function Tooltip({
  content,
  children,
  side = "top",
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape") setVisible(false);
  }

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": visible ? tooltipId : undefined,
      } as Record<string, unknown>)
    : children;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      {visible ? (
        <span
          role="tooltip"
          id={tooltipId}
          className={[
            "pointer-events-none absolute left-1/2 z-20 w-max max-w-[260px] -translate-x-1/2",
            "rounded-[var(--lr-r-sm)] bg-[var(--lr-night-900)] px-2.5 py-[7px]",
            "text-[.8125rem] text-[var(--lr-ivory-100)] shadow-[var(--lr-e2)]",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            className,
          ].join(" ")}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
