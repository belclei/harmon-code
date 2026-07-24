import { type KeyboardEvent, useRef } from "react";

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedProps {
  /** Accessible name for the group (e.g. "Período"). */
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Harmon's segmented control (index.html id="tabs", "segmented"). Unlike
 * `Tabs`, this never switches visible panel content — it's a mutually
 * exclusive filter/period toggle — so it uses the WAI-ARIA `radiogroup`/
 * `radio` pattern instead of `tablist`/`tab`.
 */
export function Segmented({
  label,
  options,
  value,
  onChange,
  className = "",
}: SegmentedProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  function focusOptionAt(index: number) {
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role=radio]")
      [index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled);
    const currentPos = enabled.findIndex(
      ({ option }) => option.value === value,
    );
    if (currentPos === -1) return;

    let target: (typeof enabled)[number] | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        target = enabled[(currentPos + 1) % enabled.length];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        target = enabled[(currentPos - 1 + enabled.length) % enabled.length];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target) {
      onChange(target.option.value);
      focusOptionAt(target.index);
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={[
        "inline-flex gap-0.5 rounded-[var(--hm-r-md)] border border-[var(--hm-border)]",
        "bg-[var(--hm-surface-sunken)] p-[3px]",
        className,
      ].join(" ")}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            // biome-ignore lint/a11y/useSemanticElements: a native <input type="radio"> can't be styled/positioned as this pill-track segmented control
            role="radio"
            aria-checked={isActive}
            disabled={option.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={[
              "cursor-pointer rounded-[6px] px-4 py-2 text-[.8125rem] text-[var(--hm-text-2)]",
              "transition-colors duration-150",
              isActive
                ? "bg-[var(--hm-surface)] text-[var(--hm-text)] shadow-[var(--hm-e1)]"
                : "",
              "disabled:pointer-events-none disabled:opacity-45",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
