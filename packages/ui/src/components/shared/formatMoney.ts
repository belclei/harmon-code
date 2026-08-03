const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formats integer cents as pt-BR currency ("R$ 1.234,56"). The only place in
 * `@lurem/ui` allowed to touch money formatting — `IMPLEMENTACAO.md §7`:
 * "nunca formatar dinheiro à mão." Every component that renders a cents
 * value must go through this function.
 */
export function formatMoney(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}
