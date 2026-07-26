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

  return (
    <AuthContext.Provider
      value={{ accessToken, user, isBooting, login, logout }}
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
