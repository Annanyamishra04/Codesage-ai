"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getCurrentUser as fetchCurrentUser, logout as logoutRequest } from "@/lib/api-client";
import type { PublicUser } from "@/types/user";

interface AuthContextValue {
  user: PublicUser | null;
  /** True until the initial /api/auth/me check has resolved. */
  isLoading: boolean;
  /** Re-fetches the current user (call after login/register). */
  refresh: (user?: PublicUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(
    (nextUser?: PublicUser | null) => {
      if (nextUser !== undefined) {
        setUser(nextUser);
        setIsLoading(false);
      } else {
        load();
      }
    },
    [load]
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
