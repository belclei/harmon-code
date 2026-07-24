import { type KeyboardEvent, useRef } from "react";

export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  /** Accessible name for the tablist — there's no visible heading tied to it by default. */
  label: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Id base for `aria-controls`/`id` pairing with real tabpanels elsewhere in the DOM (`${id}-panel-${value}`). Omit if this tablist doesn't own separate panels. */
  id?: string;
  className?: string;
}

/**
 * Harmon's tab list (index.html id="tabs", WAI-ARIA Tabs pattern). A dumb,
 * controlled component: it never owns which panel is "active" — the caller
 * does, via `value`/`onChange` — it only renders the trigger row and its
 * keyboard behavior (Left/Right/Home/End, roving tabindex).
 */
export function Tabs({
  label,
  items,
  value,
  onChange,
  id,
  className = "",
}: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function focusTabAt(index: number) {
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
      [index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled);
    const currentPos = enabled.findIndex(({ item }) => item.value === value);
    if (currentPos === -1) return;

    let target: (typeof enabled)[number] | undefined;
    switch (event.key) {
      case "ArrowRight":
        target = enabled[(currentPos + 1) % enabled.length];
        break;
      case "ArrowLeft":
        target = enabled[(currentPos - 1 + enabled.length) % enabled.length];
        break;
      case "Home":
        target = enabled[0];
        break;
      case "End":
        target = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target) {
      onChange(target.item.value);
      focusTabAt(target.index);
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={[
        "flex gap-[var(--hm-s3)] border-b border-[var(--hm-border)]",
        className,
      ].join(" ")}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={id ? `${id}-tab-${item.value}` : undefined}
            aria-selected={isActive}
            aria-controls={id ? `${id}-panel-${item.value}` : undefined}
            disabled={item.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={[
              "-mb-px cursor-pointer border-b-2 border-transparent bg-transparent px-0.5 py-3",
              "text-[.9375rem] text-[var(--hm-text-2)] transition-colors duration-150",
              "hover:text-[var(--hm-text)]",
              isActive
                ? "border-b-[var(--hm-sand-500)] text-[var(--hm-text)]"
                : "",
              "disabled:pointer-events-none disabled:opacity-45",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
