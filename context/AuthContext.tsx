"use client";
// context/AuthContext.tsx
// Provides real-time user authentication and profile state to your entire app.

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { getUser, getToken, removeToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  avatar_url?: string;
  full_name?: string;
  plan?: string;
  plan_tier?: string;
  user_type?: string;
  level?: number;
  streak?: number;
  xp?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  setUser: () => {},
  logout: () => {},
  refetchUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API}/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => {
          const base = prev || getUser() || { id: "", email: "", name: "" };
          const rawPlan = data.plan_tier || data.user_type || "Free";
          const formattedPlan = rawPlan.replace("_", " ").toUpperCase() + " PLAN";

          return {
            ...base,
            name: data.user_name || data.full_name || base.name,
            full_name: data.full_name || data.user_name || base.name,
            image: data.avatar_url || data.image || base.image,
            avatar_url: data.avatar_url || data.image || base.image,
            plan: formattedPlan,
            plan_tier: formattedPlan,
            user_type: data.user_type,
            level: data.level || 1,
            xp: data.current_xp || 0,
          };
        });
      }
    } catch {
      // Fail soft
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUser(savedUser);
      refetchUser();
    }
    setIsLoading(false);
  }, [refetchUser]);

  const logout = () => {
    removeToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_name");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
    }
    setUser(null);
    router.push("/login");
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    isLoggedIn: !!user,
    setUser,
    logout,
    refetchUser,
  }), [user, isLoading, refetchUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}