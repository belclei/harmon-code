import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "../Button/Button";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
}

export interface EmptyStateProps {
  /** Decorative — always `aria-hidden`. index.html's own examples are line-art SVGs in `--lr-night-300`. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /**
   * 1–2 buttons, centered below the text (index.html id="carregando",
   * "Estado vazio": "Nunca é uma tela morta — sempre carrega o próximo
   * passo concreto").
   */
  actions?: EmptyStateAction[];
  className?: string;
}

/** Harmon's empty/no-results state. Dumb component: it renders whatever copy and actions the caller passes. */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "rounded-[var(--lr-r-md)] border border-dashed border-[var(--lr-border)]",
        "px-[var(--lr-s3)] py-[var(--lr-s8)] text-center",
        className,
      ].join(" ")}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 items-center justify-center text-[var(--lr-night-300)] [&>svg]:h-full [&>svg]:w-full"
        >
          {icon}
        </span>
      ) : null}
      <p className="m-0 mt-[var(--lr-s2)] mb-1.5 text-[1.0625rem] text-[var(--lr-text)]">
        {title}
      </p>
      {description ? (
        <p className="mx-auto mb-[var(--lr-s3)] max-w-[42ch] text-[.875rem] text-[var(--lr-text-secondary)]">
          {description}
        </p>
      ) : null}
      {actions && actions.length > 0 ? (
        <div className="flex justify-center gap-2.5">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant ?? "primary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
