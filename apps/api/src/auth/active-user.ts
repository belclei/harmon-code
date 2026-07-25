// apps/api/src/auth/active-user.ts

// Shared gate used by every route that resolves a `User` row before trusting
// it (login, refresh, google, /v1/me). A disabled or soft-deleted user must
// not be able to authenticate or keep using a session — callers decide which
// error to throw (auth.invalid_credentials for "log me in" flows so account
// existence/disabled-ness never leaks; auth.token_invalid for "I already had
// a session" flows, since a live session just became invalid).
export function isUserActive(user: {
  status: string;
  deletedAt: Date | null;
}): boolean {
  return user.status === "active" && user.deletedAt === null;
}
