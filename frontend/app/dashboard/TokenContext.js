"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  api,
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  setOnAccessTokenChanged,
  setOnUnauthorized
} from "../../lib/api";

export const TokenContext = createContext({
  token: "",
  user: null,
  setToken: () => {},
  login: async () => null,
  logout: () => {},
  loading: false
});

export function TokenProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    return getAuthSession().accessToken || "";
  });
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setToken = useCallback((value) => {
    setTokenState(value);
    if (value) {
      const { refreshToken, deviceId } = getAuthSession();
      setAuthSession({ accessToken: value, refreshToken, deviceId });
      return;
    }
    clearAuthSession();
    setUserState(null);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setTokenState("");
    setUserState(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAuthSession({
      accessToken: data.accessToken || "",
      refreshToken: data.refreshToken || "",
      deviceId: data.deviceId || ""
    });
    setTokenState(data.accessToken || "");
    const userData = data.user || { name: "", email: "", role: "" };
    setUserState(userData);
    return userData;
  }, []);

  useEffect(() => {
    setOnUnauthorized(logout);
    return () => setOnUnauthorized(() => {});
  }, [logout]);

  useEffect(() => {
    const saved = getAuthSession().accessToken;
    if (saved) setTokenState(saved);
    setLoading(false);
  }, []);

  useEffect(() => {
    setOnAccessTokenChanged((value) => setTokenState(value || ""));
    return () => setOnAccessTokenChanged(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const onStorage = (event) => {
      if (event.key !== ACCESS_TOKEN_STORAGE_KEY) return;
      const nextToken = event.newValue || "";
      setTokenState(nextToken);
      if (!nextToken) setUserState(null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!token) {
      setUserState(null);
      return;
    }
    api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setUserState(r.data))
      .catch(() => setUserState(null));
  }, [token]);

  return (
    <TokenContext.Provider value={{ token, user, setToken, login, logout, loading }}>
      {children}
    </TokenContext.Provider>
  );
}
