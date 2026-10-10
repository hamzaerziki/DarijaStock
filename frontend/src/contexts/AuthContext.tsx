import * as React from "react";
import { api, TOKEN_KEY } from "@/lib/api";

export type CurrentUser = {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  permissions: string[];
  last_login_at?: string | null;
};

type AuthState = {
  user: CurrentUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .get<CurrentUser>("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const r = await api.post<{ access_token: string; token_type: string }>("/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, r.data.access_token);
    setToken(r.data.access_token);
    const me = await api.get<CurrentUser>("/auth/me");
    setUser(me.data);
    return me.data;
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}