// apps/api/src/insights/compute.ts
// Orquestra os três cálculos do core sobre um dataset já carregado. Puro:
// (dataset, asOf) → os 3 cards. Toda a matemática vive em @lurem/core.
import {
  disponivelHoje,
  fluxoDeCaixaFuturo,
  patrimonioTotal,
} from "@lurem/core";
import type { Money } from "@lurem/domain";
import type { InsightsDataset } from "./load.js";

export interface DashboardInsights {
  disponivelHoje: Money;
  /** = fluxoDeCaixaFuturo[0] (saldo[1], §3.3): a previsão para o fim do mês. */
  previsaoFimDoMes: Money;
  patrimonioTotal: Money;
}

export function computeDashboard(
  dataset: InsightsDataset,
  asOf: Date,
): DashboardInsights {
  const flow = fluxoDeCaixaFuturo(dataset, asOf);
  const previsaoFimDoMes = flow[0];
  if (!previsaoFimDoMes) {
    // O core garante 12 meses de horizonte (§3.3); guarda defensiva para o tipo.
    throw new Error("fluxoDeCaixaFuturo retornou horizonte vazio.");
  }
  return {
    disponivelHoje: disponivelHoje(dataset, asOf),
    previsaoFimDoMes,
    patrimonioTotal: patrimonioTotal(dataset, asOf),
  };
}
