import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { API_BASE } from "../config/constants";

const TOKEN_KEY = "qpt-access-token";
const USER_KEY = "qpt-user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(token);

  const login = useCallback((accessToken, userData) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (userData) localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData ?? null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // best effort — always clear local state
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, user, login, logout }),
    [isAuthenticated, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}