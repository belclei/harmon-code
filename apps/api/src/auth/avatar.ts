// ARQUITETURA.md §6.1 (26/07/2026) — cadeia de resolução de avatar.
import { createHash } from "node:crypto";

export type AvatarMode = "auto" | "dicebear" | "gravatar" | "google";

export interface AvatarSource {
  name: string;
  email: string;
  avatarMode: AvatarMode;
  googleAvatarUrl: string | null;
}

function gravatarUrl(email: string): string {
  const hash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
  // d=404 makes Gravatar respond with a real 404 (instead of a generated
  // default image) when the user never set one — that's what lets the
  // frontend's <img onError> cascade actually detect "no Gravatar" and
  // fall through to Dicebear.
  return `https://www.gravatar.com/avatar/${hash}?d=404`;
}

function dicebearUrl(name: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
}

/**
 * Ordered list of avatar URLs to try, in order — the caller (the `Avatar`
 * component in packages/ui) just renders the first one and falls through to
 * the next on a load error. Always ends in Dicebear, which never 404s, so
 * the list always has at least one working entry.
 */
export function computeAvatarUrls(user: AvatarSource): string[] {
  const dicebear = dicebearUrl(user.name);
  const gravatar = gravatarUrl(user.email);

  switch (user.avatarMode) {
    case "dicebear":
      return [dicebear];
    case "gravatar":
      return [gravatar, dicebear];
    case "google":
      return user.googleAvatarUrl ? [user.googleAvatarUrl, dicebear] : [dicebear];
    default:
      return [
        ...(user.googleAvatarUrl ? [user.googleAvatarUrl] : []),
        gravatar,
        dicebear,
      ];
  }
}
