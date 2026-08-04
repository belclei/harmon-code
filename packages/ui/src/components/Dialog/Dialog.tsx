import { type ReactNode, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "../shared/useModalBehavior";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** e.g. a confirmation `Input` ("Digite Itaú para confirmar", index.html id="dialogo"). */
  children?: ReactNode;
  /** Action buttons, right-aligned — typically a `Button` "Cancelar" + a `Button variant="danger"`. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Lurem's confirmation dialog (index.html id="dialogo", WAI-ARIA Dialog
 * (Modal) pattern). A dumb, controlled component — `open` and what happens
 * on confirm both live with the caller; this only renders the modal chrome
 * and its focus/keyboard behavior (see `useModalBehavior`).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = "",
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useModalBehavior(open, onClose, containerRef);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--lr-night-900)]/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        // biome-ignore lint/a11y/useSemanticElements: native <dialog>'s imperative showModal()/close() and ::backdrop pseudo-element don't fit an `open`-prop-controlled, token-styled component — role="dialog" + the manual trap in useModalBehavior implements the same APG pattern
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={[
          "w-full max-w-[480px] rounded-[var(--lr-r-lg)] border border-[var(--lr-border)]",
          "bg-[var(--lr-surface)] p-[var(--lr-s4)] shadow-[var(--lr-e2)]",
          className,
        ].join(" ")}
      >
        <h2
          id={titleId}
          className="m-0 mb-2 text-[1.25rem] font-normal tracking-[-0.01em] text-[var(--lr-text)]"
        >
          {title}
        </h2>
        {description ? (
          <p
            id={descId}
            className="m-0 mb-[var(--lr-s3)] text-[.9375rem] text-[var(--lr-text-secondary)]"
          >
            {description}
          </p>
        ) : null}
        {children}
        {footer ? (
          <div className="mt-[var(--lr-s3)] flex justify-end gap-2.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
