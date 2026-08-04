const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

/**
 * Formats an ISO date string as pt-BR `dd/mm/aaaa` — `IMPLEMENTACAO.md §7`.
 * The only place in `@lurem/ui` allowed to format dates for display.
 */
export function formatDate(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
}
