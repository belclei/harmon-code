import { type ReactNode, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "../shared/useModalBehavior";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Lurem's mobile bottom sheet (index.html id="dialogo") — same modal
 * behavior as `Dialog` (see `useModalBehavior`), different chrome: anchored
 * to the bottom edge, rounded only on top, with a grab handle.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className = "",
}: SheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useModalBehavior(open, onClose, containerRef);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end bg-[var(--lr-night-900)]/40 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        // biome-ignore lint/a11y/useSemanticElements: same tradeoff as Dialog.tsx — native <dialog>'s imperative API doesn't fit an `open`-prop-controlled component
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={[
          "w-full rounded-t-[var(--lr-r-lg)] border-t border-[var(--lr-border)]",
          "bg-[var(--lr-surface)] p-[var(--lr-s3)] pb-[var(--lr-s4)] shadow-[var(--lr-e2)]",
          className,
        ].join(" ")}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-[var(--lr-s3)] h-1 w-9 rounded-full bg-[var(--lr-border)]"
        />
        {title ? (
          <p id={titleId} className="lr-label mb-3">
            {title}
          </p>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
