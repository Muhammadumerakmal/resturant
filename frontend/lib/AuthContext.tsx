"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SafeUser } from "@repo/shared";
import { apiFetch, ApiError } from "@/lib/api";

// Customer auth state. The JWT lives in an httpOnly cookie (not readable by JS),
// so we learn who the user is by calling GET /auth/me. apiFetch sends the cookie
// via credentials:"include".

interface AuthContextValue {
  user: SafeUser | null;
  ready: boolean; // false until the initial /auth/me check resolves
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { user } = await apiFetch<{ user: SafeUser }>("/api/v1/auth/me");
      setUser(user);
    } catch (err) {
      // 401 = not logged in; anything else we also treat as logged-out.
      if (!(err instanceof ApiError)) console.error("auth/me failed:", err);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await apiFetch<{ user: SafeUser }>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(user);
  }, []);

  const signup = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      phone?: string;
    }) => {
      const { user } = await apiFetch<{ user: SafeUser }>("/api/v1/auth/signup", {
        method: "POST",
        body: input,
      });
      setUser(user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
