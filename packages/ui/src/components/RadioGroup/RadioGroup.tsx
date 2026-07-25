import { useId } from "react";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Visible legend for the whole group — every group must have one. */
  label: string;
  /** Shared `name` for the underlying radio inputs — native radio grouping (arrow-key roving, single selection) comes from the browser, not from this component. Defaults to an internally generated id. */
  name?: string;
  options: RadioOption[];
  value?: string | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** Border-only error state (index.html id="selecao") — no message slot; compose with `Alert`/`FieldMessage` if one is needed. */
  error?: boolean;
  className?: string;
  id?: string;
}

/** Harmon's radio group. A dumb, controlled component — `value` is owned entirely by the caller. */
export function RadioGroup({
  label,
  name,
  options,
  value = null,
  onChange,
  disabled = false,
  error = false,
  className = "",
  id,
}: RadioGroupProps) {
  const autoId = useId();
  const groupName = name ?? id ?? autoId;

  return (
    <fieldset className={["m-0 grid gap-2 border-0 p-0", className].join(" ")}>
      <legend className="mb-0.5 p-0 text-[.9375rem] font-medium text-[var(--hm-text)]">
        {label}
      </legend>
      {options.map((option) => {
        const optionDisabled = disabled || option.disabled;
        const isChecked = option.value === value;
        return (
          <label
            key={option.value}
            className={[
              "inline-flex items-start gap-2.5 text-[.9375rem] text-[var(--hm-text)]",
              optionDisabled
                ? "cursor-not-allowed opacity-45"
                : "cursor-pointer",
            ].join(" ")}
          >
            <span className="relative mt-px inline-flex h-5 w-5 flex-none">
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={isChecked}
                disabled={optionDisabled}
                onChange={() => onChange?.(option.value)}
                className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <span
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute inset-0 rounded-full transition-colors duration-150",
                  isChecked
                    ? "border-[6px] border-[var(--hm-ink-900)] bg-[var(--hm-surface)] dark:border-[var(--hm-ink-700)]"
                    : error
                      ? "border border-[var(--hm-clay-600)] bg-[var(--hm-surface)]"
                      : "border border-[var(--hm-ink-300)] bg-[var(--hm-surface)]",
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--hm-focus-ring)]",
                ].join(" ")}
              />
            </span>
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
