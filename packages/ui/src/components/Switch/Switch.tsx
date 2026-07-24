import { useId } from "react";

type SwitchBaseProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export type SwitchProps =
  | (SwitchBaseProps & {
      /** Visible label rendered after the pill. */
      label: string;
      "aria-label"?: string;
    })
  | (SwitchBaseProps & {
      label?: undefined;
      /** Required when there's no visible `label` — the switch's only accessible name. */
      "aria-label": string;
    });

/**
 * Harmon's toggle (index.html id="selecao"). A real `role="switch"` button,
 * not a checkbox — WAI-ARIA's own recommended pattern for an on/off control
 * that applies immediately (a preference), as opposed to `Checkbox`, which
 * waits for a form's own "Salvar".
 */
export function Switch({
  checked = false,
  onChange,
  disabled = false,
  id,
  className = "",
  label,
  "aria-label": ariaLabel,
}: SwitchProps) {
  const autoId = useId();
  const labelId = `${id ?? autoId}-label`;

  function toggle() {
    if (disabled) return;
    onChange?.(!checked);
  }

  return (
    <span className={["inline-flex items-center gap-3", className].join(" ")}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        onClick={toggle}
        className={[
          "inline-flex h-[26px] w-11 flex-none cursor-pointer items-center rounded-[var(--hm-r-full)] border border-transparent p-[3px]",
          "transition-colors duration-150 ease-out",
          // index.html's raw --hm-ink-200 track is light-mode-only (same gap
          // already fixed elsewhere in this file set) — --hm-border steps to
          // --hm-ink-700 in dark automatically, so the off-track never
          // disappears against a dark page.
          checked ? "bg-[var(--hm-sage-600)]" : "bg-[var(--hm-border)]",
          "disabled:cursor-not-allowed disabled:opacity-45",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "h-5 w-5 rounded-full bg-white shadow-[var(--hm-e1)] transition-transform duration-300",
            checked ? "translate-x-[18px]" : "translate-x-0",
          ].join(" ")}
        />
      </button>
      {label ? (
        <span
          id={labelId}
          className={[
            "text-[.9375rem] text-[var(--hm-text)]",
            disabled ? "opacity-45" : "",
          ].join(" ")}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
