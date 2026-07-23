import {
  type FocusEvent,
  type KeyboardEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FieldMessage } from "../shared/FieldMessage";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Visible label — every select must have one. */
  label: string;
  options: SelectOption[];
  /** Currently selected value, or `null`/`undefined` for none. Controlled by the caller. */
  value?: string | null;
  /** Called with the newly chosen option's value. This component never owns the selection. */
  onChange?: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  /** Copy shown when the search query matches nothing. */
  emptyMessage?: string;
  /** Starts the listbox open — exists only to make the "open" state reachable in Storybook/tests. */
  defaultOpen?: boolean;
}

/**
 * Harmon's searchable dropdown (combobox pattern, WAI-ARIA 1.2). Open/closed
 * and the search query are local UI state, not business logic: the component
 * never decides *what* the options are or what selecting one means.
 */
export function Select({
  label,
  options,
  value = null,
  onChange,
  placeholder = "Selecione…",
  hint,
  error,
  disabled = false,
  id,
  emptyMessage = "Nenhuma opção encontrada",
  defaultOpen = false,
}: SelectProps) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-listbox`;
  const errorId = `${baseId}-error`;
  const hintId = `${baseId}-hint`;

  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) ?? null;
  const hasError = Boolean(error);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLocaleLowerCase("pt-BR");
    return options.filter((o) =>
      o.label.toLocaleLowerCase("pt-BR").includes(q),
    );
  }, [options, query]);

  function commit(optionValue: string) {
    onChange?.(optionValue);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        else
          setHighlighted((h) =>
            Math.min(h + 1, Math.max(filtered.length - 1, 0)),
          );
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter": {
        const target = filtered[highlighted];
        event.preventDefault();
        if (open && target) commit(target.value);
        else setOpen(true);
        break;
      }
      case "Escape":
        setOpen(false);
        setQuery("");
        break;
      default:
        break;
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setOpen(false);
      setQuery("");
    }
  }

  const activeOption = open ? filtered[highlighted] : undefined;

  return (
    <div className="grid gap-1.5" ref={containerRef} onBlur={handleBlur}>
      <label
        htmlFor={inputId}
        className="text-[.9375rem] font-medium text-[var(--hm-text)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeOption ? `${baseId}-opt-${activeOption.value}` : undefined
          }
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : hint ? hintId : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : (selectedOption?.label ?? "")}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={[
            "w-full min-h-11 rounded-[var(--hm-r-md)] pl-3.5 pr-9 text-[.9375rem]",
            "bg-[var(--hm-surface)] text-[var(--hm-text)] border transition-colors duration-150",
            "placeholder:text-[var(--hm-text-2)]",
            "disabled:bg-[var(--hm-surface-sunken)] disabled:text-[var(--hm-text-2)]",
            "disabled:cursor-not-allowed disabled:pointer-events-none",
            hasError
              ? "border-[var(--hm-clay-600)]"
              : open
                ? "border-[var(--hm-ink-300)]"
                : "border-[var(--hm-border)] hover:border-[var(--hm-ink-300)]",
          ].join(" ")}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={[
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hm-text-2)]",
            "transition-transform duration-150",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>

        {open ? (
          // This is the WAI-ARIA 1.2 "editable combobox with list autocomplete"
          // pattern (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/):
          // <div role="listbox">/<div role="option"> (not <ul>/<li> — those
          // carry list semantics that don't match "listbox" either, and
          // trip Biome's noNoninteractiveElementToInteractiveRole the same
          // way a heading would) is intentional, and real DOM focus
          // intentionally never leaves the <input> above — aria-activedescendant
          // is how the highlighted option is communicated to assistive tech,
          // not tabIndex on each option. useSemanticElements' suggestion of a
          // native <select> doesn't apply: <option> can't be styled or
          // positioned as a floating, searchable panel. Verified with
          // axe-core (zero violations) and manual keyboard testing
          // (Arrow/Enter/Escape) — see Sprint 1′ report.
          <div
            id={listId}
            // biome-ignore lint/a11y/useSemanticElements: a native <select>/<option> can't be styled as a floating searchable listbox
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            className={[
              "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[var(--hm-r-md)]",
              "border border-[var(--hm-border)] bg-[var(--hm-surface)] py-1 shadow-[var(--hm-e2)]",
            ].join(" ")}
          >
            {filtered.length === 0 ? (
              <div className="px-3.5 py-2 text-sm text-[var(--hm-text-2)]">
                {emptyMessage}
              </div>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlighted;
                return (
                  <div
                    key={option.value}
                    id={`${baseId}-opt-${option.value}`}
                    // biome-ignore lint/a11y/useSemanticElements: a native <option> can't be styled/positioned inside this floating panel
                    role="option"
                    tabIndex={-1}
                    aria-selected={isSelected}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      commit(option.value);
                    }}
                    onMouseEnter={() => setHighlighted(index)}
                    className={[
                      "cursor-pointer px-3.5 py-2 text-[.9375rem]",
                      isHighlighted ? "bg-[var(--hm-surface-sunken)]" : "",
                      isSelected
                        ? "font-bold text-[var(--hm-text)]"
                        : "text-[var(--hm-text)]",
                    ].join(" ")}
                  >
                    {option.label}
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      <FieldMessage
        hintId={hintId}
        errorId={errorId}
        hint={hint}
        error={error}
      />
    </div>
  );
}
