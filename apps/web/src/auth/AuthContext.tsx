// apps/web/src/auth/AuthContext.tsx
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  fetchMe,
  refreshAccessToken,
} from "./api-client";
import type { MeResponse } from "./types";

export interface AuthContextValue {
  accessToken: string | null;
  user: MeResponse | null;
  /** True until the boot-time silent refresh attempt has resolved. Routes
   * that need a session should wait for this before deciding to redirect
   * to /login — otherwise a returning user with a valid cookie would flash
   * the login screen before the refresh call comes back. */
  isBooting: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches `/v1/me` and updates `user` — call after a settings mutation
   * (name/birthDate/theme) since `user` here lives in this context's own
   * state, not react-query's cache, so invalidating a query key alone
   * wouldn't refresh what components read via `useAuth().user`. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  // Boot-time silent session restore: try the refresh cookie once before
  // ever showing /login, so a returning user isn't asked to log in again
  // just because the SPA reloaded and lost its in-memory access token.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (token) {
        setAccessTokenState(token);
        try {
          const me = await fetchMe();
          if (!cancelled) setUser(me);
        } catch {
          if (!cancelled) {
            setAccessTokenState(null);
            setUser(null);
          }
        }
      }
      if (!cancelled) setIsBooting(false);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const token = await apiLogin(email, password);
    setAccessTokenState(token);
    const me = await fetchMe();
    setUser(me);
  }

  async function logout(): Promise<void> {
    await apiLogout();
    setAccessTokenState(null);
    setUser(null);
  }

  async function refreshUser(): Promise<void> {
    const me = await fetchMe();
    setUser(me);
  }

  // Applies immediately (US-3.13) — packages/ui and this app's own
  // tailwind.css both key the `dark:` variant off `[data-theme="dark"]`
  // (not Tailwind's default `.dark` class, not the OS media query — see
  // that file's comment), so persisting themePref to the DB alone does
  // nothing visually until something writes the attribute back to the DOM.
  // No user (logged out, e.g. /login) falls back to light, matching the
  // app's behavior before this attribute existed at all.
  useEffect(() => {
    document.documentElement.dataset.theme = user?.themePref ?? "light";
  }, [user?.themePref]);

  return (
    <AuthContext.Provider
      value={{ accessToken, user, isBooting, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
