// apps/web/src/auth/token-store.ts
//
// The access token deliberately lives in memory only (never localStorage,
// never a non-httpOnly cookie — see the backend contract's rationale: a
// short-lived token that can't be exfiltrated by XSS via storage APIs).
// This tiny module-scoped store is what lets api-client.ts (plain
// functions, outside the React tree) read/write the current token without
// going through React context or prop-drilling a setter everywhere fetch is
// called. AuthContext.tsx is the only thing that syncs this store to
// component state for rendering.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
