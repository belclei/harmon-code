// packages/ui/src/components/InsightCard/breakdownLabel.ts
// §3.0: BreakdownLine.label é um "rótulo estável (a UI traduz/estiliza)". O
// core emite chaves em inglês; esta é a camada de tradução para pt-BR. Chaves
// desconhecidas caem no humanizador (troca _ por espaço, capitaliza) para
// nunca vazar snake_case cru na tela.
const LABELS: Record<string, string> = {
  opening_balance: "Saldo inicial",
  transaction: "Transação",
  overdraft_note: "Cheque especial",
  closed_invoice: "Fatura fechada",
  closed_invoice_transaction: "Transação da fatura",
  scheduled_tx: "Agendada",
  recurring_expense: "Despesa recorrente",
  recurring_income: "Receita recorrente",
  previous_month_balance: "Saldo do mês anterior",
  card_debt: "Dívida no cartão",
};

export function breakdownLabel(label: string): string {
  const translated = LABELS[label];
  if (translated) return translated;
  const humanized = label.replace(/_/g, " ");
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}
