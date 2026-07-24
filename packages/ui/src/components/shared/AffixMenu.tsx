import { type FocusEvent, type KeyboardEvent, useRef, useState } from "react";

export interface AffixMenuOption {
  value: string;
  /** Short code shown in the closed trigger and as the option's leading column (e.g. "BRL"). */
  code: string;
  /** Full name, e.g. "Real". */
  label: string;
  /** Symbol shown trailing in the open menu, e.g. "R$". */
  symbol?: string;
}

export interface AffixMenuProps {
  id: string;
  /** Accessible name for the trigger button and the listbox (e.g. "Moeda"). */
  label: string;
  options: AffixMenuOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CHEVRON_PATH =
  "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z";

/**
 * Interactive leading affix for `Input` — a compact menu-button (WAI-ARIA
 * "Menu Button" trigger over a `listbox`, not a combobox: there's no search,
 * just a small fixed set of mutually exclusive options, e.g. a currency
 * code). A decorative affix and this one must read as visibly different, or
 * the user either clicks what doesn't respond or never discovers what does
 * (brand/design-system's own affix spec) — the signals here are the
 * chevron, the hover state, a real border separating it from the field, and
 * `aria-haspopup`.
 */
export function AffixMenu({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
}: AffixMenuProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const buttonId = `${id}-button`;
  const listId = `${id}-listbox`;
  const selected = options.find((o) => o.value === value);
  const activeOption = open ? options[highlighted] : undefined;

  function openAt(index: number) {
    setOpen(true);
    setHighlighted(Math.max(index, 0));
  }

  function commit(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const selectedIndex = options.findIndex((o) => o.value === value);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openAt(selectedIndex);
        else setHighlighted((h) => Math.min(h + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openAt(selectedIndex);
        else setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) {
          const target = options[highlighted];
          if (target) commit(target.value);
        } else {
          openAt(selectedIndex);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef} onBlur={handleBlur}>
      <button
        type="button"
        id={buttonId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          activeOption ? `${id}-opt-${activeOption.value}` : undefined
        }
        aria-label={`${label}: ${selected?.code ?? ""}`}
        onClick={() => {
          if (open) setOpen(false);
          else openAt(options.findIndex((o) => o.value === value));
        }}
        onKeyDown={handleKeyDown}
        className={[
          "flex h-full cursor-pointer items-center gap-1.5 rounded-l-[var(--hm-r-md)]",
          "border border-r-[var(--hm-border)] bg-[var(--hm-surface-sunken)] px-3",
          "font-mono text-[.875rem] text-[var(--hm-text-2)] transition-colors duration-150",
          "hover:bg-[var(--hm-border)]/30 hover:text-[var(--hm-text)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
        ].join(" ")}
      >
        {selected?.code}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={[
            "h-3.5 w-3.5 flex-none transition-transform duration-150",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <path fillRule="evenodd" d={CHEVRON_PATH} clipRule="evenodd" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          // biome-ignore lint/a11y/useSemanticElements: a native <select>/<option> can't be styled/positioned as a floating panel — same precedent as Select.tsx
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={[
            "absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-[var(--hm-r-md)]",
            "border border-[var(--hm-border)] bg-[var(--hm-surface)] py-1 shadow-[var(--hm-e2)]",
          ].join(" ")}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = activeOption?.value === option.value;
            return (
              <div
                key={option.value}
                id={`${id}-opt-${option.value}`}
                // biome-ignore lint/a11y/useSemanticElements: see listbox comment above
                role="option"
                tabIndex={-1}
                aria-selected={isSelected}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(option.value);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={[
                  "flex cursor-pointer items-center gap-3 px-3.5 py-2 text-[.875rem]",
                  isSelected
                    ? "bg-[var(--hm-blue-100)] dark:bg-[var(--hm-blue-700)]/30"
                    : isHighlighted
                      ? "bg-[var(--hm-surface-sunken)]"
                      : "",
                ].join(" ")}
              >
                <span className="w-10 flex-none font-mono font-bold text-[var(--hm-text)]">
                  {option.code}
                </span>
                <span className="flex-1 text-[var(--hm-text-2)]">
                  {option.label}
                </span>
                {option.symbol ? (
                  <span className="flex-none font-mono text-[var(--hm-text-2)]">
                    {option.symbol}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
