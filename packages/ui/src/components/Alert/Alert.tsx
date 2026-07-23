import type { ReactNode } from "react";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: AlertVariant;
  title: string;
  description?: ReactNode;
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

const ICON_PATHS: Record<AlertVariant, string> = {
  info: "M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-3a1.125 1.125 0 100 2.25A1.125 1.125 0 0010 6z",
  success:
    "M16.704 5.29a1 1 0 010 1.415l-7.005 7a1 1 0 01-1.416 0l-3.005-3a1 1 0 111.415-1.414l2.298 2.296 6.298-6.296a1 1 0 011.415 0z",
  warning:
    "M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.164c.75 1.333-.213 2.987-1.743 2.987H3.72c-1.53 0-2.493-1.654-1.743-2.987L8.257 3.1zM10 7a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z",
  error:
    "M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-4a1.125 1.125 0 100 2.25A1.125 1.125 0 0010 5z",
};

/**
 * Harmon's inline notification. Dumb component: it renders whatever
 * title/description the caller passes and only reports "the user asked to
 * close this" — it never decides when to appear or disappear on its own.
 */
export function Alert({
  variant = "info",
  title,
  description,
  onClose,
  className = "",
}: AlertProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role={styles.role}
      className={[
        "flex items-start gap-3 rounded-[var(--hm-r-md)] p-4",
        styles.bg,
        className,
      ].join(" ")}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={["mt-0.5 h-5 w-5 flex-none", styles.icon].join(" ")}
      >
        <path fillRule="evenodd" clipRule="evenodd" d={ICON_PATHS[variant]} />
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
