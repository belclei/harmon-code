import type { Money } from "@harmon/domain";
import { useState } from "react";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Heading } from "../Typography/Heading";
import { Mono } from "../Typography/Mono";
import { formatMoney } from "../shared/formatMoney";

export interface InsightCardProps {
  /** "Disponível Hoje" | "Previsão fim do mês" | "Patrimônio Total" (§6.9) — any label, this component doesn't special-case the three. */
  title: string;
  money: Money;
  /** Storybook-only escape hatch to render the "expandido" state without a click. Real screens always start closed. */
  defaultExpanded?: boolean;
}

/**
 * Harmon's dashboard hero card: one value + its explainable breakdown
 * (§6.9 "explicabilidade acima de autoridade"). Dumb component — `money`
 * arrives fully computed from `packages/core`; this only renders it.
 */
export function InsightCard({
  title,
  money,
  defaultExpanded = false,
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card>
      <Body muted className="text-[.8125rem]">
        {title}
      </Body>
      <Mono variant="number" className="mt-1 block text-[2rem]">
        {formatMoney(money.valueCents)}
      </Mono>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-[.8125rem] font-medium text-[var(--hm-blue-700)] underline-offset-2 hover:underline dark:text-[var(--hm-blue-300)]"
      >
        {expanded ? "Ocultar detalhes" : "De onde vem esse número?"}
      </button>
      {expanded ? (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-[var(--hm-border)] pt-3">
          {money.breakdown.map((line, index) => (
            <li
              // BreakdownLine has no stable id (§3.0 of IMPLEMENTACAO.md) — label+index
              // is safe here because the list is caller-supplied and re-renders in place,
              // never reordered independently of its own data.
              key={`${line.label}-${index}`}
              className={[
                "flex items-center justify-between gap-3 text-[.875rem]",
                line.isEstimate
                  ? "border-l-2 border-dashed border-[var(--hm-sand-500)] pl-2"
                  : "",
              ].join(" ")}
            >
              <Body as="span" className="truncate">
                {line.label}
              </Body>
              <Mono
                variant="number"
                tone={
                  line.isEstimate
                    ? "estimate"
                    : line.valueCents < 0
                      ? "out"
                      : "in"
                }
              >
                {formatMoney(line.valueCents)}
              </Mono>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
