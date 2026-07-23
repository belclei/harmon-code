import type { ReactNode } from "react";
import { Button } from "../Button/Button";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertAction {
  label: string;
  onClick: () => void;
  /**
   * index.html id="alerta": an alert's action is always discreet — ghost or
   * secondary — never a filled/primary button, which would compete with the
   * screen's own primary action. Defaults to "ghost".
   */
  variant?: "ghost" | "secondary";
}

export interface AlertProps {
  variant?: AlertVariant;
  title: string;
  description?: ReactNode;
  /**
   * 1–2 buttons rendered to the right of the text, vertically centered
   * (index.html id="alerta", `.hmc-alert__actions`). When there are two, put
   * the more likely one last (rightmost) — matches the reference's own
   * ordering rule. Below 560px width the actions wrap onto their own line,
   * left-aligned under the text.
   */
  actions?: AlertAction[];
  /** When provided, a close button is rendered and this is called on click. Purely presentational — dismissal state lives with the caller. */
  onClose?: () => void;
  className?: string;
}

// harmon-tokens.css never redefines the raw --hm-*-100 tints (or the
// AA-checked --hm-*-700 text tones) for [data-theme="dark"] — they're only
// meant as "light wash on a light page". Used as-is, a dark-theme Alert
// would render a near-white title on a near-white background (title uses
// var(--hm-text), which becomes --hm-bone-100 in dark mode). Fixed the same
// way harmon-tokens.css already handles --hm-label/--hm-money-in (a
// lighter, ~300-tier tone for dark) and a translucent wash of the base hue
// instead of the flat pastel for the background.
const VARIANT_STYLES: Record<
  AlertVariant,
  { bg: string; icon: string; role: "status" | "alert" }
> = {
  info: {
    bg: "bg-[var(--hm-blue-100)] dark:bg-[var(--hm-blue-700)]/20",
    icon: "text-[var(--hm-blue-700)] dark:text-[var(--hm-blue-300)]",
    role: "status",
  },
  success: {
    bg: "bg-[var(--hm-sage-100)] dark:bg-[var(--hm-sage-700)]/20",
    icon: "text-[var(--hm-sage-700)] dark:text-[var(--hm-sage-300)]",
    role: "status",
  },
  warning: {
    bg: "bg-[var(--hm-sand-100)] dark:bg-[var(--hm-sand-700)]/20",
    icon: "text-[var(--hm-sand-700)] dark:text-[var(--hm-sand-300)]",
    role: "alert",
  },
  error: {
    bg: "bg-[var(--hm-clay-100)] dark:bg-[var(--hm-clay-600)]/20",
    icon: "text-[var(--hm-clay-650)] dark:text-[var(--hm-clay-500)]",
    role: "alert",
  },
};

// Reference (index.html id="alerta", lines 979/987/994/1002): stroke-based
// line icons, viewBox 24×24, stroke-width 1.8 — not the filled 20×20
// Heroicons-style paths this component used before. Also fixes a real
// mismatch: the previous `info` and `error` shapes were both a
// circle+bar+dot at nearly the same coordinates (bar y9→13, dot at y≈6 for
// info vs y≈5 for error) — visually near-identical at a glance. The
// reference deliberately distinguishes them: info's dot sits ABOVE its bar
// (an "i" — M12 11v5 M12 8h.01, dot at top), error/danger's dot sits BELOW
// its bar (a "!" — M12 8v5 M12 16h.01, dot at bottom).
const ICON_PATHS: Record<AlertVariant, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 3 19h18z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
};

// index.html id="alerta": actions are always ghost/secondary, sized `sm` —
// never a filled/primary button. `Button`'s "tertiary" variant is the
// reference's "ghost" (see Button.tsx's own comment on that naming).
const ACTION_VARIANT_MAP = {
  ghost: "tertiary",
  secondary: "secondary",
} as const;

/**
 * Harmon's inline notification. Dumb component: it renders whatever
 * title/description the caller passes and only reports "the user asked to
 * close this" — it never decides when to appear or disappear on its own.
 */
export function Alert({
  variant = "info",
  title,
  description,
  actions,
  onClose,
  className = "",
}: AlertProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role={styles.role}
      className={[
        "flex items-start gap-3 rounded-[var(--hm-r-md)] p-4",
        // index.html id="alerta": below 560px, actions wrap onto their own
        // line under the text instead of squeezing beside it.
        "max-[560px]:flex-wrap",
        styles.bg,
        className,
      ].join(" ")}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className={["mt-px h-[18px] w-[18px] flex-none", styles.icon].join(" ")}
      >
        {ICON_PATHS[variant]}
      </svg>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[.875rem] font-bold text-[var(--hm-text)]">
          {title}
        </p>
        {description ? (
          // NOT --hm-text-2: that token is AA-checked against the neutral
          // --hm-bg/--hm-surface only (per its own v1.1 comment in
          // harmon-tokens.css). On top of these variants' tinted washes
          // (blue-100/sage-100/clay-100 etc.) it measured 4.12–4.35:1 via
          // axe-core — short of the 4.5:1 this component's own a11y bar
          // requires. brand/design-system/harmon-components.css's
          // `.hmc-alert__body` has this identical gap. Full-strength text
          // trades a bit of visual "secondary" softness for guaranteed AA.
          <p className="m-0 mt-0.5 text-[.875rem] text-[var(--hm-text)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions && actions.length > 0 ? (
        <div
          className={[
            "flex flex-none items-center gap-2 self-center",
            "ml-[var(--hm-s2)]",
            // index.html id="alerta": below 560px the actions stretch to
            // full width, drop the left margin in favor of 30px of
            // left padding (aligns under the text, after the icon), and
            // left-justify instead of trailing the text.
            "max-[560px]:ml-0 max-[560px]:mt-2.5 max-[560px]:w-full",
            "max-[560px]:justify-start max-[560px]:self-stretch max-[560px]:pl-[30px]",
          ].join(" ")}
        >
          {actions.map((action) => (
            <Button
              key={action.label}
              type="button"
              size="sm"
              variant={ACTION_VARIANT_MAP[action.variant ?? "ghost"]}
              onClick={action.onClick}
              // Button's "tertiary"/ghost text color (--hm-text-2) was only
              // ever AA-checked against the plain page surface, not against
              // Alert's own tinted backgrounds (blue-100/sage-100/etc.) —
              // axe-core caught exactly that combination here: 4.35:1 on
              // sage-100, short of 4.5:1. Same "text on its own tint" class
              // of bug already flagged on Badge/Alert's own title-text
              // comments elsewhere in this file; the fix is the same one
              // already applied to this component's title/description:
              // force full-strength --hm-text instead of the muted tone.
              // The trailing `!` is Tailwind v4's important-utility syntax —
              // needed because two different arbitrary-value utility
              // classes targeting `color` don't otherwise have a
              // predictable winner based on this component's own class order.
              className="text-[var(--hm-text)]!"
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar alerta"
          className="-m-1 flex-none rounded-[var(--hm-r-sm)] p-1 text-[var(--hm-text-2)] opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
