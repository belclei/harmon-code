export type MonthDayValue = number | "last";

export interface MonthDayPickerProps {
  /** Visible label — e.g. "Todo dia do mês" (index.html id="calendario", "Seletor de dia do mês — recorrências"). */
  label: string;
  value?: MonthDayValue | null;
  onChange?: (value: MonthDayValue) => void;
  className?: string;
}

// 29–31 don't exist in every month; muted (not disabled — they still work,
// they just fall back to the month's last day) rather than the calendar's
// own `is-outside`/disabled treatment, which would wrongly imply they're
// unusable.
const MUTED_DAYS = new Set([29, 30, 31]);
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

/**
 * Harmon's "which day of the month" recurrence picker (index.html
 * id="calendario") — a flat 1–31 grid plus a "fim" (last day) option, no
 * month/weekday context (unlike `Calendar`, this isn't tied to any specific
 * month). A dumb, controlled component.
 */
export function MonthDayPicker({
  label,
  value = null,
  onChange,
  className = "",
}: MonthDayPickerProps) {
  return (
    <div className={["grid gap-1.5", className].join(" ")}>
      <span className="text-[.9375rem] font-medium text-[var(--hm-text)]">
        {label}
      </span>
      <div
        // biome-ignore lint/a11y/useSemanticElements: a native <fieldset> groups form controls with a <legend>, not a day-number grid — role="group" + aria-label is the correct APG substitute here
        role="group"
        aria-label={label}
        className="grid grid-cols-8 gap-[3px]"
      >
        {DAYS.map((day) => {
          const isSelected = value === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange?.(day)}
              aria-pressed={isSelected}
              className={[
                "min-h-8 cursor-pointer rounded-[var(--hm-r-sm)] border border-transparent font-mono text-[.8125rem]",
                "transition-colors duration-150",
                isSelected
                  ? "bg-[var(--hm-ink-900)] text-[var(--hm-bone-000)] dark:bg-[var(--hm-ink-700)]"
                  : [
                      "hover:bg-[var(--hm-surface-sunken)]",
                      MUTED_DAYS.has(day)
                        ? "text-[var(--hm-text-2)]"
                        : "text-[var(--hm-text)]",
                    ].join(" "),
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange?.("last")}
          aria-pressed={value === "last"}
          className={[
            "min-h-8 cursor-pointer rounded-[var(--hm-r-sm)] border border-transparent font-mono text-[.625rem]",
            "transition-colors duration-150",
            value === "last"
              ? "bg-[var(--hm-ink-900)] text-[var(--hm-bone-000)] dark:bg-[var(--hm-ink-700)]"
              : "text-[var(--hm-text)] hover:bg-[var(--hm-surface-sunken)]",
          ].join(" ")}
        >
          fim
        </button>
      </div>
    </div>
  );
}
