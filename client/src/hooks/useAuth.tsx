import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { clearToken, getToken, setToken } from "../api/axios";
import { loginApi, logoutApi, meApi, type AuthUser, type LoginPayload } from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginPayload, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) return;
    meApi()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginPayload, remember: boolean) => {
    const { token, user } = await loginApi(payload);
    setToken(token, remember);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      /* bỏ qua: vẫn đăng xuất phía client */
    }
    clearToken();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider");
  return ctx;
}
