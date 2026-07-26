// apps/api/src/institutions/logo-url.ts
// `Institution.logoAsset` (IMPLEMENTACAO.md §1.3) stores a path relative to
// apps/web's static asset root (e.g. "ui-tokens/institutions/nubank.svg"),
// matching the files actually shipped under apps/web/public/. This turns
// that stored path into the absolute URL the browser fetches.
import type { Institution } from "@harmon/db";

export function institutionLogoUrl(
  institution: Pick<Institution, "logoAsset"> | null,
): string | undefined {
  return institution ? `/${institution.logoAsset}` : undefined;
}
