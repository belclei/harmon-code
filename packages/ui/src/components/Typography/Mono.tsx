import type { HTMLAttributes } from "react";

export type MonoVariant = "number" | "code";
export type MonoTone = "default" | "in" | "out" | "estimate";

export interface MonoProps extends HTMLAttributes<HTMLElement> {
  /** "number" is for money/quantities — tabular-nums via the `.hm-money` primitive (IMPLEMENTACAO §7: "Números/valores em Red Hat Mono com tabular-nums, nunca formatar dinheiro à mão"). "code" adds a subtle inline chip for code snippets. */
  variant?: MonoVariant;
  /** Only meaningful for `variant="number"`. `estimate` marks a projected (not real) value — never reuses the `in`/`out` money colors, per the product's own §1.2.3 rule. */
  tone?: MonoTone;
}

const TONE_CLASSES: Record<MonoTone, string> = {
  default: "hm-money",
  in: "hm-money hm-money--in",
  out: "hm-money hm-money--out",
  estimate: "hm-money hm-estimate",
};

/**
 * Monospace text: numeric/money values (`variant="number"`, the primary use
 * per §7) or inline code (`variant="code"`). This component only formats —
 * it never computes or fetches the value it is given.
 */
export function Mono({
  variant = "number",
  tone = "default",
  className = "",
  children,
  ...rest
}: MonoProps) {
  if (variant === "code") {
    return (
      <code
        {...rest}
        className={[
          "rounded-[var(--hm-r-sm)] bg-[var(--hm-surface-sunken)] px-1.5 py-0.5 font-mono text-[.875em] text-[var(--hm-text)]",
          className,
        ].join(" ")}
      >
        {children}
      </code>
    );
  }

  return (
    <span {...rest} className={[TONE_CLASSES[tone], className].join(" ")}>
      {children}
    </span>
  );
}
