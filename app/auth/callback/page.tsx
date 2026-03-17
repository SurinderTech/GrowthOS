"use client";
// app/auth/callback/page.tsx
// After Google/Facebook/LinkedIn login, FastAPI redirects here with:
//   http://localhost:3000/auth/callback?token=xxxxx
//
// This page grabs the token, saves it, then redirects to dashboard.

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveToken, saveUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      toast.error(decodeURIComponent(error));
      router.push("/login");
      return;
    }

    if (!token) {
      toast.error("Authentication failed — no token received");
      router.push("/login");
      return;
    }

    // Save the JWT token
    saveToken(token);

    // Fetch user info from FastAPI using the token
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((user) => {
        saveUser(user);
        setUser(user);
        toast.success("Welcome to GrowthOS! 🎉");
        router.push("/dashboard");
      })
      .catch(() => {
        toast.error("Login succeeded but failed to get user info");
        router.push("/dashboard");
      });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a1628",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "16px",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "44px",
        height: "44px",
        border: "4px solid rgba(33,150,243,0.2)",
        borderTop: "4px solid #2196f3",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#b0bec5", fontSize: "0.9rem" }}>Completing sign in...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}