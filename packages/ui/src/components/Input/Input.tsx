import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { AffixMenu, type AffixMenuOption } from "../shared/AffixMenu";
import { FieldMessage } from "../shared/FieldMessage";

export type InputType = "text" | "email" | "password" | "number";

export interface InputAffixMenuProps {
  /** Accessible name for the trigger button and its listbox (e.g. "Moeda"). */
  label: string;
  options: AffixMenuOption[];
  value: string;
  onChange: (value: string) => void;
}

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
  /**
   * Static, non-interactive decoration at the field's leading edge — a
   * currency prefix ("R$") or a search icon (index.html id="campo"/id="affix",
   * `.hmc-affix`/`.hmc-inputgroup`). Ignored when `affixMenu` is set.
   */
  affix?: ReactNode;
  /**
   * Interactive leading affix (index.html id="affix", "affix falante" /
   * `.hmc-affix--action`) — a menu button for picking among a small fixed
   * set of options (e.g. currency: BRL/USD/EUR) instead of a plain prefix.
   * Takes over from `affix` when set. See `AffixMenu`.
   */
  affixMenu?: InputAffixMenuProps;
  /**
   * Harmon's money typography (index.html id="campo", `.hmc-input--money`):
   * mono, tabular-nums, right-aligned, larger size. Also defaults
   * `inputMode` to `"decimal"` so mobile shows the numeric keypad — the
   * sign lives in the value/prefix, never typed by hand (§ "o sinal fica no
   * prefixo, nunca digitado").
   */
  money?: boolean;
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
  affix,
  affixMenu,
  money = false,
  readOnly,
  inputMode,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const affixMenuId = `${inputId}-affix`;
  const hasError = Boolean(error);
  const hasAffix = Boolean(affixMenu) || Boolean(affix);

  const inputEl = (
    <input
      {...rest}
      id={inputId}
      type={type}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      inputMode={inputMode ?? (money ? "decimal" : undefined)}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : hint ? hintId : undefined}
      className={[
        "w-full min-h-11 px-3.5 text-[.9375rem]",
        "bg-[var(--hm-surface)] text-[var(--hm-text)] border transition-colors duration-150",
        "placeholder:text-[var(--hm-text-2)]",
        "disabled:bg-[var(--hm-surface-sunken)] disabled:text-[var(--hm-text-2)]",
        "disabled:cursor-not-allowed disabled:pointer-events-none",
        hasAffix
          ? "rounded-l-none rounded-r-[var(--hm-r-md)] border-l-0"
          : "rounded-[var(--hm-r-md)]",
        // index.html id="campo": readonly is dashed + sunken, distinct from
        // disabled — the value is still visible/selectable, just not editable.
        readOnly
          ? "border-dashed border-[var(--hm-border)] bg-[var(--hm-surface-sunken)]"
          : hasError
            ? "border-[var(--hm-clay-600)]"
            : "border-[var(--hm-border)] hover:border-[var(--hm-ink-300)]",
        // index.html id="campo", `.hmc-input--money`.
        money
          ? "text-right font-mono text-[1.125rem] [font-variant-numeric:tabular-nums]"
          : "",
        className,
      ].join(" ")}
    />
  );

  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={inputId}
        className="text-[.9375rem] font-medium text-[var(--hm-text)]"
      >
        {label}
        {required ? (
          // Same dark-mode contrast gap just found and fixed in
          // FieldMessage's error text (--hm-clay-600 measures 3.17:1 on
          // the dark theme's --hm-bg, and even --hm-clay-500 only reaches
          // 3.95:1 for text) — this asterisk uses the identical token and
          // was never exercised by a story, so axe-core never caught it.
          // Same fix: --hm-clay-300, the brand's AA-checked clay tone for a
          // dark surface (also Badge.tsx's precedent, also --hm-money-out's
          // dark value).
          <span className="text-[var(--hm-clay-600)] dark:text-[var(--hm-clay-300)]">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {affixMenu ? (
        <div className="flex items-stretch">
          <AffixMenu
            id={affixMenuId}
            label={affixMenu.label}
            options={affixMenu.options}
            value={affixMenu.value}
            onChange={affixMenu.onChange}
            disabled={disabled}
          />
          {inputEl}
        </div>
      ) : affix ? (
        // index.html id="campo"/id="affix": `.hmc-inputgroup` + static
        // `.hmc-affix` — a non-interactive prefix sharing one visual box
        // with the field (rounded only on its outer corner, no right border).
        <div className="flex items-stretch">
          {/* Not aria-hidden: unlike Button/Alert's icons, this can carry
              meaningful text (a currency prefix like "R$") that a screen
              reader user needs — the caller is responsible for passing an
              aria-hidden icon here if the affix is purely decorative. */}
          <span className="grid flex-none place-items-center rounded-l-[var(--hm-r-md)] border border-r-0 border-[var(--hm-border)] bg-[var(--hm-surface-sunken)] px-3 font-mono text-[.875rem] text-[var(--hm-text-2)]">
            {affix}
          </span>
          {inputEl}
        </div>
      ) : (
        inputEl
      )}
      <FieldMessage
        hintId={hintId}
        errorId={errorId}
        hint={hint}
        error={error}
      />
    </div>
  );
}
