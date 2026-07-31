// apps/api/src/email/render-template.ts
// Nenhum motor de template existe no projeto — 2 e-mails não justificam
// trazer Handlebars/EJS/etc (YAGNI). Substituição por regex é suficiente:
// sem loops/condicionais nos templates.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "templates",
);

export function substituteVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => vars[key] ?? "",
  );
}

export function renderTemplate(
  fileName: string,
  vars: Record<string, string>,
): string {
  const raw = readFileSync(join(TEMPLATES_DIR, fileName), "utf-8");
  return substituteVars(raw, vars);
}
