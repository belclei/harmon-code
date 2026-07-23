import type { ReactNode } from "react";

export type BadgeStatus = "active" | "inactive" | "pending";
export type BadgeCategoryColor = "ink" | "blue" | "sage" | "sand" | "clay";

interface BadgeCommonProps {
  children: ReactNode;
  className?: string;
}

export interface BadgeStatusProps extends BadgeCommonProps {
  kind: "status";
  status: BadgeStatus;
}

export interface BadgeCategoryProps extends BadgeCommonProps {
  kind: "category";
  /** Category color is decided by the caller (e.g. from the category record's own `color` field) — the Badge just paints it. Ignored when `none` is set. */
  color: BadgeCategoryColor;
  icon?: ReactNode;
  /**
   * "Sem categoria" — index.html id="badge": category is optional on a
   * transaction (§6.5), so this is a legitimate, deliberately muted state,
   * not an error. Overrides `color`/`icon` to the neutral dashed treatment.
   */
  none?: boolean;
  /**
   * AI-suggested, not yet confirmed by a human — index.html id="badge" rule:
   * "Sugestão da IA vem sempre tracejada até o humano confirmar." Adds a
   * dashed border on top of the normal `color` styling; ignored when `none`
   * is set (an unconfirmed suggestion is never simultaneously "no category").
   */
  suggested?: boolean;
  /** Renders a trailing × affordance; called when the user removes this category from the record. */
  onRemove?: () => void;
  /** Accessible label for the remove button. Defaults to "Remover categoria". */
  removeLabel?: string;
}

export type BadgeProps = BadgeStatusProps | BadgeCategoryProps;

// bg/text pairs use the v1.1 AA-checked text tokens from harmon-tokens.css
// (--hm-*-700, or --hm-clay-650 on clay-100) rather than the older
// hardcoded hex in brand/design-system/harmon-components.css, which
// predates that AA correction — see Sprint report for the flag.
// Same dark-mode gap as Alert: the raw --hm-*-100 tints and --hm-*-700 text
// tones are only checked for a light page, so they get a dark: override
// each (translucent wash of the base hue + the ~300-tier lighter text).
//
// Two pairs failed axe-core's color-contrast check even in that scheme,
// because --hm-blue-700/--hm-sage-700 were only AA-checked against the
// neutral page background (harmon-tokens.css's own v1.1 comment), not
// against their *own* -100 chip background — a badge/chip is exactly the
// "text on its own tint" case that check never covered:
//   blue-700 (#5069A8) on blue-100 (#E2E7F2) → 4.32:1 (needs 4.5:1)
//   sage-700 (#5D705E) on sage-100 (#E4EAE2) → 4.35:1 (needs 4.5:1)
// #4C649F / #5A6C5A below are those same hues nudged darker (HSL lightness
// only) until they clear 4.5:1, computed against these exact backgrounds —
// not in harmon-tokens.css yet; flagged for a designer to fold into the
// token set as real "on-chip" text tokens rather than living as one-off
// hex here. The dark-mode clay chip had the same problem (clay-500 on the
// clay-700/20 wash measured 3.34:1); reused --hm-money-out's dark value
// (#E08A7D) instead of inventing a third clay hex, since that's already
// the brand's answer to "clay tone readable on a dark surface".
const STATUS_STYLES: Record<
  BadgeStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  active: {
    bg: "bg-[var(--hm-sage-100)] dark:bg-[var(--hm-sage-700)]/20",
    text: "text-[#5A6C5A] dark:text-[var(--hm-sage-300)]",
    dot: "bg-[var(--hm-sage-700)] dark:bg-[var(--hm-sage-300)]",
    label: "Ativo",
  },
  inactive: {
    bg: "bg-[var(--hm-bone-100)] dark:bg-white/10",
    text: "text-[var(--hm-text-2)]",
    dot: "bg-[var(--hm-ink-500)] dark:bg-[var(--hm-ink-300)]",
    label: "Inativo",
  },
  pending: {
    bg: "bg-[var(--hm-sand-100)] dark:bg-[var(--hm-sand-700)]/20",
    text: "text-[var(--hm-sand-700)] dark:text-[var(--hm-sand-300)]",
    dot: "bg-[var(--hm-sand-600)] dark:bg-[var(--hm-sand-300)]",
    label: "Pendente",
  },
};

const CATEGORY_STYLES: Record<
  BadgeCategoryColor,
  { bg: string; text: string }
> = {
  ink: {
    bg: "bg-[var(--hm-bone-100)] dark:bg-white/10",
    text: "text-[var(--hm-ink-700)] dark:text-[var(--hm-ink-200)]",
  },
  blue: {
    bg: "bg-[var(--hm-blue-100)] dark:bg-[var(--hm-blue-700)]/20",
    text: "text-[#4C649F] dark:text-[var(--hm-blue-300)]",
  },
  sage: {
    bg: "bg-[var(--hm-sage-100)] dark:bg-[var(--hm-sage-700)]/20",
    text: "text-[#5A6C5A] dark:text-[var(--hm-sage-300)]",
  },
  sand: {
    bg: "bg-[var(--hm-sand-100)] dark:bg-[var(--hm-sand-700)]/20",
    text: "text-[var(--hm-sand-700)] dark:text-[var(--hm-sand-300)]",
  },
  clay: {
    bg: "bg-[var(--hm-clay-100)] dark:bg-[var(--hm-clay-600)]/20",
    text: "text-[var(--hm-clay-650)] dark:text-[#E08A7D]",
  },
};

/**
 * Harmon's small status/category pill. Dumb component: `status` and `color`
 * are enums the caller picks from data it already has — nothing here is
 * computed from business rules.
 */
export function Badge(props: BadgeProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-[var(--hm-r-full)] px-2.5 py-1 text-[.75rem] font-medium";

  if (props.kind === "status") {
    const s = STATUS_STYLES[props.status];
    return (
      <span className={[base, s.bg, s.text, props.className ?? ""].join(" ")}>
        <span
          aria-hidden="true"
          className={["h-1.5 w-1.5 rounded-full", s.dot].join(" ")}
        />
        {props.children}
      </span>
    );
  }

  const c = CATEGORY_STYLES[props.color];
  // index.html id="badge", ".hmc-chip--none": neutral, dashed, transparent —
  // takes over from the normal per-color bg/text entirely.
  const noneClasses =
    "border border-dashed border-[var(--hm-border)] bg-transparent text-[var(--hm-text-2)]";
  // index.html id="badge", "sugerida pela IA": a dashed border layered on
  // top of the normal colored chip, in --hm-blue-500 — never combined with `none`.
  const suggestedClasses = "border border-dashed border-[var(--hm-blue-500)]";

  return (
    <span
      className={[
        base,
        props.none ? noneClasses : [c.bg, c.text].join(" "),
        !props.none && props.suggested ? suggestedClasses : "",
        props.className ?? "",
      ].join(" ")}
    >
      {!props.none && props.icon ? (
        <span aria-hidden="true" className="h-3.5 w-3.5 flex-none">
          {props.icon}
        </span>
      ) : null}
      {props.children}
      {props.onRemove ? (
        <button
          type="button"
          onClick={props.onRemove}
          aria-label={props.removeLabel ?? "Remover categoria"}
          className="-mr-1 ml-0.5 inline-flex h-3.5 w-3.5 flex-none items-center justify-center text-[var(--hm-text-2)] hover:text-[var(--hm-text)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-full w-full"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

/** Convenience defaults for the `status` kind's own copy (pt-BR), reused across stories. */
export const BADGE_STATUS_LABEL: Record<BadgeStatus, string> = {
  active: STATUS_STYLES.active.label,
  inactive: STATUS_STYLES.inactive.label,
  pending: STATUS_STYLES.pending.label,
};
