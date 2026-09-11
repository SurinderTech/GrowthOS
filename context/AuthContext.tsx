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
  email_verified?: boolean;
  onboarding_completed?: boolean;
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
      // Fetch /auth/me for user status including verification
      const meRes = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let meData: any = null;
      if (meRes.ok) {
        meData = await meRes.json();
      }

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
            name: meData?.name || data.user_name || data.full_name || base.name,
            full_name: data.full_name || data.user_name || base.name,
            image: meData?.image || data.avatar_url || data.image || base.image,
            avatar_url: meData?.avatar_url || data.avatar_url || data.image || base.image,
            email_verified: meData ? meData.email_verified : base.email_verified,
            plan: formattedPlan,
            plan_tier: formattedPlan,
            user_type: data.user_type,
            level: data.level || 1,
            xp: data.current_xp || 0,
          };
        });
      } else if (meData) {
        setUser((prev) => {
          const base = prev || getUser() || { id: "", email: "", name: "" };
          const rawPlan = meData.plan_tier || meData.user_type || "Free";
          const formattedPlan = rawPlan.replace("_", " ").toUpperCase() + " PLAN";

          return {
            ...base,
            id: meData.id || base.id,
            email: meData.email || base.email,
            name: meData.name || meData.full_name || base.name,
            full_name: meData.full_name || meData.name || base.name,
            image: meData.image || meData.avatar_url || base.image,
            avatar_url: meData.avatar_url || meData.image || base.image,
            email_verified: meData.email_verified ?? base.email_verified,
            onboarding_completed: meData.onboarding_completed ?? base.onboarding_completed,
            plan: formattedPlan,
            plan_tier: formattedPlan,
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