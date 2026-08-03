import type { Money } from "@lurem/domain";
import { Body } from "../Typography/Body";
import { Mono } from "../Typography/Mono";
import { formatMoney } from "../shared/formatMoney";
import { breakdownLabel } from "./breakdownLabel";

export interface BreakdownProps {
  /** As linhas de decomposição de um `Money` (§3.0). */
  lines: Money["breakdown"];
  className?: string;
}

/**
 * A lista "de onde vem esse número?" (§4.2): uma linha por `BreakdownLine`,
 * com o rótulo e o valor com sinal. Linhas de estimativa (§4.3) nunca reusam
 * as cores de valor confirmado — a borda tracejada + `tone="estimate"` marcam
 * a diferença. Componente burro: recebe as linhas já calculadas pelo core.
 */
export function Breakdown({ lines, className = "" }: BreakdownProps) {
  return (
    <ul
      className={[
        "flex flex-col gap-1.5 border-t border-[var(--lr-border)] pt-3",
        className,
      ].join(" ")}
    >
      {lines.map((line, index) => (
        <li
          // BreakdownLine não tem id estável (§3.0) — label+index é seguro aqui
          // porque a lista é fornecida pelo caller e re-renderiza no lugar.
          key={`${line.label}-${index}`}
          className={[
            "flex items-center justify-between gap-3 text-[.875rem]",
            line.isEstimate
              ? "border-l-2 border-dashed border-[var(--lr-gold-500)] pl-2"
              : "",
          ].join(" ")}
        >
          <Body as="span" className="truncate">
            {breakdownLabel(line.label)}
          </Body>
          <Mono
            variant="number"
            tone={
              line.isEstimate ? "estimate" : line.valueCents < 0 ? "out" : "in"
            }
          >
            {formatMoney(line.valueCents)}
          </Mono>
        </li>
      ))}
    </ul>
  );
}
