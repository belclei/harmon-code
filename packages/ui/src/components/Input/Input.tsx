import { type InputHTMLAttributes, useId } from "react";
import { FieldMessage } from "../shared/FieldMessage";

export type InputType = "text" | "email" | "password" | "number";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** HTML input type. Harmon's Storybook only guarantees coverage for these four. */
  type?: InputType;
  /** Visible label — every input must have one; there is no `placeholder`-only mode. */
  label: string;
  /** Helper copy shown under the field when there is no error. */
  hint?: string;
  /** Error message. When set, the field switches to the error visual state and `aria-invalid`. */
  error?: string;
}

/**
 * Harmon's base text field. A dumb, presentational component — validation
 * logic lives entirely with the caller; this component only renders the
 * `error` string it is handed.
 */
export function Input({
  type = "text",
  label,
  hint,
  error,
  disabled = false,
  required,
  id,
  className = "",
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={inputId}
        className="text-[.9375rem] font-medium text-[var(--hm-text)]"
      >
        {label}
        {required ? (
          <span className="text-[var(--hm-clay-600)]"> *</span>
        ) : null}
      </label>
      <input
        {...rest}
        id={inputId}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : hint ? hintId : undefined}
        className={[
          "w-full min-h-11 rounded-[var(--hm-r-md)] px-3.5 text-[.9375rem]",
          "bg-[var(--hm-surface)] text-[var(--hm-text)] border transition-colors duration-150",
          "placeholder:text-[var(--hm-text-2)]",
          "disabled:bg-[var(--hm-surface-sunken)] disabled:text-[var(--hm-text-2)]",
          "disabled:cursor-not-allowed disabled:pointer-events-none",
          hasError
            ? "border-[var(--hm-clay-600)]"
            : "border-[var(--hm-border)] hover:border-[var(--hm-ink-300)]",
          className,
        ].join(" ")}
      />
      <FieldMessage
        hintId={hintId}
        errorId={errorId}
        hint={hint}
        error={error}
      />
    </div>
  );
}
