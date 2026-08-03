import type { Money } from "@harmon/domain";
import { formatMoney } from "@harmon/ui";
// apps/web/src/routes/DashboardView.test.tsx
// BACKLOG.md US-3.11 — critérios de UI vinculantes (§4.1/§4.2) como teste de CI:
//   §4.1 no máximo UM número em escala herói por rota (.lr-money--hero ≤ 1);
//   §4.2 todo card abre sua decomposição ("de onde vem esse número?").
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardView } from "./DashboardView";

// formatMoney usa espaço estreito sem quebra (U+202F) entre "R$" e o número;
// o normalizador do testing-library colapsa isso para espaço normal no DOM,
// então o matcher precisa fazer o mesmo para bater.
function moneyText(cents: number): string {
  return formatMoney(cents).replace(/[  ]/g, " ");
}

function money(lines: Array<[string, number]>): Money {
  const breakdown = lines.map(([label, valueCents]) => ({
    label,
    valueCents,
    kind: "account_balance" as const,
    isEstimate: false,
  }));
  return {
    valueCents: breakdown.reduce((s, l) => s + l.valueCents, 0),
    breakdown,
  };
}

const INSIGHTS = {
  disponivelHoje: money([
    ["opening_balance", 80_000],
    ["transaction", 20_000],
  ]),
  previsaoFimDoMes: money([
    ["opening_balance", 130_000],
    ["recurring_income", 20_000],
  ]),
  patrimonioTotal: money([
    ["liquid", 200_000],
    ["savings", 50_000],
  ]),
};

describe("DashboardView (US-3.11)", () => {
  it("renders at most one hero-scale number (§4.1)", () => {
    const { container } = render(<DashboardView insights={INSIGHTS} />);
    expect(container.querySelectorAll(".lr-money--hero")).toHaveLength(1);
  });

  it("shows the three cards with their totals (Disponível Hoje is the hero)", () => {
    render(<DashboardView insights={INSIGHTS} />);
    expect(screen.getByText("Disponível Hoje")).toBeInTheDocument();
    expect(screen.getByText("Previsão fim do mês")).toBeInTheDocument();
    expect(screen.getByText("Patrimônio Total")).toBeInTheDocument();

    expect(screen.getByText(moneyText(100_000))).toBeInTheDocument(); // hero total
    expect(screen.getByText(moneyText(150_000))).toBeInTheDocument();
    expect(screen.getByText(moneyText(250_000))).toBeInTheDocument();
  });

  it("lets every card expand into its breakdown (§4.2)", () => {
    render(<DashboardView insights={INSIGHTS} />);
    const toggles = screen.getAllByRole("button", {
      name: /de onde vem esse número/i,
    });
    expect(toggles).toHaveLength(3);

    // Expandindo o herói, suas linhas de decomposição aparecem com rótulos
    // traduzidos (§3.0: label é chave estável, "a UI traduz").
    const heroToggle = toggles[0];
    if (!heroToggle) throw new Error("toggle do herói ausente");
    fireEvent.click(heroToggle);
    expect(screen.getByText("Saldo inicial")).toBeInTheDocument();
    expect(screen.getByText("Transação")).toBeInTheDocument();
  });
});
