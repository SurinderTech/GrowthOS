"use client";
// context/AuthContext.tsx
// Provides login state to your entire app.
// Any component can call useAuth() to get the current user or log out.

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { getUser, getToken, removeToken } from "@/lib/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // On app load, check if user is already logged in (token in localStorage)
    const token = getToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  const logout = () => {
    removeToken();
    setUser(null);
    router.push("/login");
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    isLoggedIn: !!user,
    setUser,
    logout,
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Use this hook in any component: const { user, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}